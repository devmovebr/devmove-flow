// src/runner/apps/cli.ts
import { spawn as spawn2 } from "node:child_process";
import { closeSync as closeSync3, existsSync as existsSync7, openSync as openSync3, readFileSync as readFileSync7, rmSync as rmSync4, statSync as statSync3 } from "node:fs";
import { relative } from "node:path";

// src/runner/arquivos.ts
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
var lidos = /* @__PURE__ */ new Map();
function lerCacheado(arq, parse) {
  const st = statSync(arq);
  const assinatura = `${st.mtimeMs}:${st.size}`;
  const lido = lidos.get(arq);
  if (lido?.assinatura === assinatura) return lido.valor;
  const valor = parse(readFileSync(arq, "utf8"));
  lidos.set(arq, { assinatura, valor });
  return valor;
}
function lerTrecho(arq, de) {
  const tamanho = statSync(arq).size;
  if (tamanho <= de) return { texto: "", ate: tamanho < de ? -1 : de };
  const fd = openSync(arq, "r");
  try {
    const buf = Buffer.alloc(tamanho - de);
    const lidos2 = readSync(fd, buf, 0, buf.length, de);
    const completo = buf.subarray(0, lidos2).lastIndexOf(10) + 1;
    return { texto: buf.toString("utf8", 0, completo), ate: de + completo };
  } finally {
    closeSync(fd);
  }
}

// src/runner/workspaces.ts
import { existsSync, readFileSync as readFileSync2, readdirSync, statSync as statSync2 } from "node:fs";
import { basename, dirname, join as join2, resolve } from "node:path";

// src/runner/banco.ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/shared/placar.ts
var CAMPO = { PASSOU: "passou", FALHOU: "falhou", BLOQUEADO: "bloqueado", PENDENTE: "pendente" };
function placarDe(c, total) {
  const feitos = c.passou + c.falhou + c.bloqueado + c.pendente;
  return { ...c, nao_executado: Math.max(0, total - feitos), total };
}
function contarPlacar(vereditos, total) {
  const c = { passou: 0, falhou: 0, bloqueado: 0, pendente: 0 };
  for (const v of vereditos) c[CAMPO[v] ?? "pendente"]++;
  return placarDe(c, total);
}

// src/runner/migracoes.ts
var migracoes = [
  {
    versao: 1,
    sql: `
      create table rodadas (
        id integer primary key,
        dossie text not null,
        ambiente text not null,
        origem text not null,
        autor text not null,
        status text not null,
        iniciada_em text not null,
        finalizada_em text
      );
      create table execucoes (
        id integer primary key,
        rodada_id integer not null references rodadas(id),
        cenario text not null,
        titulo text not null,
        ordem integer not null,
        cenario_md text not null,
        request json not null,
        resposta json,
        erro text,
        assercoes json not null,
        veredito text not null,
        veredito_auto text not null,
        nota text,
        executada_em text not null
      );
      create index rodadas_dossie on rodadas(dossie, id);
      create index execucoes_rodada on execucoes(rodada_id, ordem);
    `
  },
  {
    // Cobre placar, estado atual e histórico sem ler a linha inteira: veredito e executada_em vêm depois dos JSON grandes.
    versao: 2,
    sql: "create index execucoes_cenario on execucoes(rodada_id, cenario, executada_em, veredito);"
  },
  {
    // repos.txt é a fonte da verdade; a tabela é o espelho gravado pelo servidor da UI.
    versao: 3,
    sql: `
      create table repositorios (
        nome text primary key,
        url text not null,
        pasta text not null,
        registrado_em text not null,
        removido_em text
      );
    `
  }
];

// src/runner/banco.ts
function abrirBanco(ws) {
  const dir = join(ws, ".devmove");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(join(dir, "devmove.db"));
  db.exec("pragma journal_mode = wal; pragma busy_timeout = 5000; pragma foreign_keys = on;");
  db.exec("create table if not exists migracoes (versao integer primary key, aplicada_em text not null)");
  const aplicadas = new Set(
    db.prepare("select versao from migracoes").all().map((r) => r.versao)
  );
  for (const m of migracoes) {
    if (aplicadas.has(m.versao)) continue;
    db.exec("begin");
    try {
      db.exec(m.sql);
      db.prepare("insert into migracoes (versao, aplicada_em) values (?, ?)").run(m.versao, (/* @__PURE__ */ new Date()).toISOString());
      db.exec("commit");
    } catch (e) {
      db.exec("rollback");
      throw e;
    }
  }
  return db;
}
function paraExecucao(l) {
  return {
    ...l,
    request: JSON.parse(l.request),
    resposta: l.resposta ? JSON.parse(l.resposta) : null,
    assercoes: JSON.parse(l.assercoes)
  };
}
function paraRodada({ passou, falhou, bloqueado, pendente, ...r }, total) {
  return { ...r, placar: placarDe({ passou, falhou, bloqueado, pendente }, total) };
}
var RODADA = `select r.*,
    count(e.id) filter (where e.veredito = 'PASSOU') as passou,
    count(e.id) filter (where e.veredito = 'FALHOU') as falhou,
    count(e.id) filter (where e.veredito = 'BLOQUEADO') as bloqueado,
    count(e.id) filter (where e.veredito not in ('PASSOU', 'FALHOU', 'BLOQUEADO')) as pendente
  from rodadas r left join execucoes e on e.rodada_id = r.id`;
var ULTIMAS = `select e.id, r.ambiente,
    row_number() over (partition by r.ambiente, e.cenario order by e.executada_em desc, e.id desc) as n
  from execucoes e join rodadas r on r.id = e.rodada_id
  where r.dossie = :dossie and (:ambiente is null or r.ambiente = :ambiente)`;
var Repositorio = class {
  db;
  preparadas = /* @__PURE__ */ new Map();
  constructor(db) {
    this.db = db;
  }
  sql(texto2) {
    let s = this.preparadas.get(texto2);
    if (!s) this.preparadas.set(texto2, s = this.db.prepare(texto2));
    return s;
  }
  rodada(id2, total) {
    const l = this.sql(`${RODADA} where r.id = ? group by r.id`).get(id2);
    return l ? paraRodada(l, total) : null;
  }
  rodadas(dossie, total, ambiente) {
    const linhas = this.sql(`${RODADA} where r.dossie = :dossie and (:ambiente is null or r.ambiente = :ambiente) group by r.id order by r.id desc`).all({ dossie, ambiente: ambiente ?? null });
    return linhas.map((l) => paraRodada(l, total));
  }
  rodadasPorId(ids, total) {
    const linhas = this.sql(`${RODADA} where r.id in (select value from json_each(?)) group by r.id`).all(JSON.stringify([...new Set(ids)]));
    return new Map(linhas.map((l) => [l.id, paraRodada(l, total)]));
  }
  ultimaRodada(dossie, total) {
    const l = this.sql(`${RODADA} where r.dossie = ? group by r.id order by r.id desc limit 1`).get(dossie);
    return l ? paraRodada(l, total) : null;
  }
  // Um estado por ambiente, o de execução mais recente primeiro. Só entram cenários que ainda estão no plano.
  estados(dossie, cenarios) {
    const linhas = this.sql(
      `select u.ambiente, e.id, e.rodada_id, e.cenario, e.titulo, e.ordem, e.veredito, e.executada_em,
         json_extract(e.resposta, '$.status') as status, json_extract(e.resposta, '$.tempo_ms') as tempo_ms
       from (${ULTIMAS}) u join execucoes e on e.id = u.id where u.n = 1`
    ).all({ dossie, ambiente: null });
    const noPlano = new Set(cenarios);
    const porAmbiente = Map.groupBy(
      linhas.filter((l) => noPlano.has(l.cenario)),
      (l) => l.ambiente
    );
    const rodadas = this.rodadasPorId(
      linhas.map((l) => l.rodada_id),
      cenarios.length
    );
    return [...porAmbiente].map(([ambiente, ls]) => {
      const execucoes = ls.sort((a, b) => a.ordem - b.ordem).map((l) => {
        const { ambiente: _, status, tempo_ms, ...e } = l;
        return { ...e, resposta: status === null ? null : { status, tempo_ms: tempo_ms ?? 0 }, rodada: rodadas.get(e.rodada_id) };
      });
      return {
        ambiente,
        atualizado_em: execucoes.reduce((m, e) => e.executada_em > m ? e.executada_em : m, ""),
        placar: contarPlacar(
          execucoes.map((e) => e.veredito),
          cenarios.length
        ),
        execucoes
      };
    }).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
  }
  ultimasExecucoes(dossie, ambiente) {
    const linhas = this.sql(`select e.* from (${ULTIMAS}) u join execucoes e on e.id = u.id where u.n = 1`).all({ dossie, ambiente });
    return linhas.map(paraExecucao);
  }
  vereditos(dossie, ambiente) {
    return this.sql(
      `select e.rodada_id, e.cenario, e.titulo, e.veredito from execucoes e join rodadas r on r.id = e.rodada_id
       where r.dossie = :dossie and (:ambiente is null or r.ambiente = :ambiente) order by e.rodada_id, e.ordem, e.id`
    ).all({ dossie, ambiente: ambiente ?? null });
  }
  localDaRodada(id2) {
    return this.sql("select dossie, ambiente from rodadas where id = ?").get(id2);
  }
  emExecucao(dossie) {
    return this.sql("select * from rodadas where dossie = ? and status = 'executando' order by id desc limit 1").get(dossie);
  }
  ultimaAtividade(rodadaId) {
    const r = this.sql("select max(executada_em) as m from execucoes where rodada_id = ?").get(rodadaId);
    return r.m ?? "";
  }
  criarRodada(r) {
    const res = this.sql("insert into rodadas (dossie, ambiente, origem, autor, status, iniciada_em) values (?, ?, ?, ?, 'executando', ?)").run(
      r.dossie,
      r.ambiente,
      r.origem,
      r.autor,
      r.iniciada_em
    );
    return Number(res.lastInsertRowid);
  }
  finalizarRodada(id2, status) {
    this.sql("update rodadas set status = ?, finalizada_em = ? where id = ?").run(status, (/* @__PURE__ */ new Date()).toISOString(), id2);
  }
  inserirExecucao(e) {
    const res = this.sql(
      `insert into execucoes (rodada_id, cenario, titulo, ordem, cenario_md, request, resposta, erro, assercoes,
        veredito, veredito_auto, nota, executada_em) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      e.rodada_id,
      e.cenario,
      e.titulo,
      e.ordem,
      e.cenario_md,
      JSON.stringify(e.request),
      e.resposta ? JSON.stringify(e.resposta) : null,
      e.erro,
      JSON.stringify(e.assercoes),
      e.veredito,
      e.veredito_auto,
      e.nota,
      e.executada_em
    );
    return Number(res.lastInsertRowid);
  }
  execucao(id2) {
    const l = this.sql("select * from execucoes where id = ?").get(id2);
    return l ? paraExecucao(l) : null;
  }
  execucoesDaRodada(rodadaId) {
    return this.sql("select * from execucoes where rodada_id = ? order by ordem, id").all(rodadaId).map(paraExecucao);
  }
  historico(dossie, cenario) {
    return this.sql(
      `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
         where r.dossie = ? and e.cenario = ? order by e.executada_em desc, e.id desc`
    ).all(dossie, cenario).map(paraExecucao);
  }
  ultimaExecucao(dossie, ambiente, cenario) {
    const l = this.sql(
      `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
       where r.dossie = ? and r.ambiente = ? and e.cenario = ? order by e.executada_em desc, e.id desc limit 1`
    ).get(dossie, ambiente, cenario);
    return l ? paraExecucao(l) : null;
  }
  mudarVeredito(id2, veredito, nota) {
    this.sql("update execucoes set veredito = ?, nota = ? where id = ?").run(veredito, nota, id2);
  }
  // Espelha o repos.txt: o que entrou ou mudou é gravado, o que saiu ganha removido_em.
  sincronizarRepos(repos) {
    const agora = (/* @__PURE__ */ new Date()).toISOString();
    this.db.exec("begin");
    try {
      for (const r of repos) {
        this.sql(
          `insert into repositorios (nome, url, pasta, registrado_em) values (?, ?, ?, ?)
           on conflict(nome) do update set url = excluded.url, pasta = excluded.pasta, removido_em = null`
        ).run(r.nome, r.url, r.pasta, agora);
      }
      this.sql("update repositorios set removido_em = ? where removido_em is null and nome not in (select value from json_each(?))").run(
        agora,
        JSON.stringify(repos.map((r) => r.nome))
      );
      this.db.exec("commit");
    } catch (e) {
      this.db.exec("rollback");
      throw e;
    }
  }
  repos() {
    return this.sql("select nome, url, pasta from repositorios where removido_em is null order by nome").all();
  }
};
var repositorios = /* @__PURE__ */ new Map();
function repositorio(ws) {
  let r = repositorios.get(ws);
  if (!r) repositorios.set(ws, r = new Repositorio(abrirBanco(ws)));
  return r;
}

// src/runner/erros.ts
var ErroRunner = class extends Error {
  statusCode;
  constructor(mensagem, statusCode = 400) {
    super(mensagem);
    this.statusCode = statusCode;
  }
};

// node_modules/jsonpath-plus/dist/index-node-esm.js
import vm from "node:vm";
var Hooks = class {
  /**
   * @callback HookCallback
   * @this {*|Jsep} this
   * @param {Jsep} env
   * @returns: void
   */
  /**
   * Adds the given callback to the list of callbacks for the given hook.
   *
   * The callback will be invoked when the hook it is registered for is run.
   *
   * One callback function can be registered to multiple hooks and the same hook multiple times.
   *
   * @param {string|object} name The name of the hook, or an object of callbacks keyed by name
   * @param {HookCallback|boolean} callback The callback function which is given environment variables.
   * @param {?boolean} [first=false] Will add the hook to the top of the list (defaults to the bottom)
   * @public
   */
  add(name, callback, first) {
    if (typeof arguments[0] != "string") {
      for (let name2 in arguments[0]) {
        this.add(name2, arguments[0][name2], arguments[1]);
      }
    } else {
      (Array.isArray(name) ? name : [name]).forEach(function(name2) {
        this[name2] = this[name2] || [];
        if (callback) {
          this[name2][first ? "unshift" : "push"](callback);
        }
      }, this);
    }
  }
  /**
   * Runs a hook invoking all registered callbacks with the given environment variables.
   *
   * Callbacks will be invoked synchronously and in the order in which they were registered.
   *
   * @param {string} name The name of the hook.
   * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
   * @public
   */
  run(name, env) {
    this[name] = this[name] || [];
    this[name].forEach(function(callback) {
      callback.call(env && env.context ? env.context : env, env);
    });
  }
};
var Plugins = class {
  constructor(jsep2) {
    this.jsep = jsep2;
    this.registered = {};
  }
  /**
   * @callback PluginSetup
   * @this {Jsep} jsep
   * @returns: void
   */
  /**
   * Adds the given plugin(s) to the registry
   *
   * @param {object} plugins
   * @param {string} plugins.name The name of the plugin
   * @param {PluginSetup} plugins.init The init function
   * @public
   */
  register(...plugins) {
    plugins.forEach((plugin2) => {
      if (typeof plugin2 !== "object" || !plugin2.name || !plugin2.init) {
        throw new Error("Invalid JSEP plugin format");
      }
      if (this.registered[plugin2.name]) {
        return;
      }
      plugin2.init(this.jsep);
      this.registered[plugin2.name] = plugin2;
    });
  }
};
var Jsep = class _Jsep {
  /**
   * @returns {string}
   */
  static get version() {
    return "1.4.0";
  }
  /**
   * @returns {string}
   */
  static toString() {
    return "JavaScript Expression Parser (JSEP) v" + _Jsep.version;
  }
  // ==================== CONFIG ================================
  /**
   * @method addUnaryOp
   * @param {string} op_name The name of the unary op to add
   * @returns {Jsep}
   */
  static addUnaryOp(op_name) {
    _Jsep.max_unop_len = Math.max(op_name.length, _Jsep.max_unop_len);
    _Jsep.unary_ops[op_name] = 1;
    return _Jsep;
  }
  /**
   * @method jsep.addBinaryOp
   * @param {string} op_name The name of the binary op to add
   * @param {number} precedence The precedence of the binary op (can be a float). Higher number = higher precedence
   * @param {boolean} [isRightAssociative=false] whether operator is right-associative
   * @returns {Jsep}
   */
  static addBinaryOp(op_name, precedence, isRightAssociative) {
    _Jsep.max_binop_len = Math.max(op_name.length, _Jsep.max_binop_len);
    _Jsep.binary_ops[op_name] = precedence;
    if (isRightAssociative) {
      _Jsep.right_associative.add(op_name);
    } else {
      _Jsep.right_associative.delete(op_name);
    }
    return _Jsep;
  }
  /**
   * @method addIdentifierChar
   * @param {string} char The additional character to treat as a valid part of an identifier
   * @returns {Jsep}
   */
  static addIdentifierChar(char) {
    _Jsep.additional_identifier_chars.add(char);
    return _Jsep;
  }
  /**
   * @method addLiteral
   * @param {string} literal_name The name of the literal to add
   * @param {*} literal_value The value of the literal
   * @returns {Jsep}
   */
  static addLiteral(literal_name, literal_value) {
    _Jsep.literals[literal_name] = literal_value;
    return _Jsep;
  }
  /**
   * @method removeUnaryOp
   * @param {string} op_name The name of the unary op to remove
   * @returns {Jsep}
   */
  static removeUnaryOp(op_name) {
    delete _Jsep.unary_ops[op_name];
    if (op_name.length === _Jsep.max_unop_len) {
      _Jsep.max_unop_len = _Jsep.getMaxKeyLen(_Jsep.unary_ops);
    }
    return _Jsep;
  }
  /**
   * @method removeAllUnaryOps
   * @returns {Jsep}
   */
  static removeAllUnaryOps() {
    _Jsep.unary_ops = {};
    _Jsep.max_unop_len = 0;
    return _Jsep;
  }
  /**
   * @method removeIdentifierChar
   * @param {string} char The additional character to stop treating as a valid part of an identifier
   * @returns {Jsep}
   */
  static removeIdentifierChar(char) {
    _Jsep.additional_identifier_chars.delete(char);
    return _Jsep;
  }
  /**
   * @method removeBinaryOp
   * @param {string} op_name The name of the binary op to remove
   * @returns {Jsep}
   */
  static removeBinaryOp(op_name) {
    delete _Jsep.binary_ops[op_name];
    if (op_name.length === _Jsep.max_binop_len) {
      _Jsep.max_binop_len = _Jsep.getMaxKeyLen(_Jsep.binary_ops);
    }
    _Jsep.right_associative.delete(op_name);
    return _Jsep;
  }
  /**
   * @method removeAllBinaryOps
   * @returns {Jsep}
   */
  static removeAllBinaryOps() {
    _Jsep.binary_ops = {};
    _Jsep.max_binop_len = 0;
    return _Jsep;
  }
  /**
   * @method removeLiteral
   * @param {string} literal_name The name of the literal to remove
   * @returns {Jsep}
   */
  static removeLiteral(literal_name) {
    delete _Jsep.literals[literal_name];
    return _Jsep;
  }
  /**
   * @method removeAllLiterals
   * @returns {Jsep}
   */
  static removeAllLiterals() {
    _Jsep.literals = {};
    return _Jsep;
  }
  // ==================== END CONFIG ============================
  /**
   * @returns {string}
   */
  get char() {
    return this.expr.charAt(this.index);
  }
  /**
   * @returns {number}
   */
  get code() {
    return this.expr.charCodeAt(this.index);
  }
  /**
   * @param {string} expr a string with the passed in express
   * @returns Jsep
   */
  constructor(expr) {
    this.expr = expr;
    this.index = 0;
  }
  /**
   * static top-level parser
   * @returns {jsep.Expression}
   */
  static parse(expr) {
    return new _Jsep(expr).parse();
  }
  /**
   * Get the longest key length of any object
   * @param {object} obj
   * @returns {number}
   */
  static getMaxKeyLen(obj) {
    return Math.max(0, ...Object.keys(obj).map((k) => k.length));
  }
  /**
   * `ch` is a character code in the next three functions
   * @param {number} ch
   * @returns {boolean}
   */
  static isDecimalDigit(ch) {
    return ch >= 48 && ch <= 57;
  }
  /**
   * Returns the precedence of a binary operator or `0` if it isn't a binary operator. Can be float.
   * @param {string} op_val
   * @returns {number}
   */
  static binaryPrecedence(op_val) {
    return _Jsep.binary_ops[op_val] || 0;
  }
  /**
   * Looks for start of identifier
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierStart(ch) {
    return ch >= 65 && ch <= 90 || // A...Z
    ch >= 97 && ch <= 122 || // a...z
    ch >= 128 && !_Jsep.binary_ops[String.fromCharCode(ch)] || // any non-ASCII that is not an operator
    _Jsep.additional_identifier_chars.has(String.fromCharCode(ch));
  }
  /**
   * @param {number} ch
   * @returns {boolean}
   */
  static isIdentifierPart(ch) {
    return _Jsep.isIdentifierStart(ch) || _Jsep.isDecimalDigit(ch);
  }
  /**
   * throw error at index of the expression
   * @param {string} message
   * @throws
   */
  throwError(message) {
    const error = new Error(message + " at character " + this.index);
    error.index = this.index;
    error.description = message;
    throw error;
  }
  /**
   * Run a given hook
   * @param {string} name
   * @param {jsep.Expression|false} [node]
   * @returns {?jsep.Expression}
   */
  runHook(name, node) {
    if (_Jsep.hooks[name]) {
      const env = {
        context: this,
        node
      };
      _Jsep.hooks.run(name, env);
      return env.node;
    }
    return node;
  }
  /**
   * Runs a given hook until one returns a node
   * @param {string} name
   * @returns {?jsep.Expression}
   */
  searchHook(name) {
    if (_Jsep.hooks[name]) {
      const env = {
        context: this
      };
      _Jsep.hooks[name].find(function(callback) {
        callback.call(env.context, env);
        return env.node;
      });
      return env.node;
    }
  }
  /**
   * Push `index` up to the next non-space character
   */
  gobbleSpaces() {
    let ch = this.code;
    while (ch === _Jsep.SPACE_CODE || ch === _Jsep.TAB_CODE || ch === _Jsep.LF_CODE || ch === _Jsep.CR_CODE) {
      ch = this.expr.charCodeAt(++this.index);
    }
    this.runHook("gobble-spaces");
  }
  /**
   * Top-level method to parse all expressions and returns compound or single node
   * @returns {jsep.Expression}
   */
  parse() {
    this.runHook("before-all");
    const nodes = this.gobbleExpressions();
    const node = nodes.length === 1 ? nodes[0] : {
      type: _Jsep.COMPOUND,
      body: nodes
    };
    return this.runHook("after-all", node);
  }
  /**
   * top-level parser (but can be reused within as well)
   * @param {number} [untilICode]
   * @returns {jsep.Expression[]}
   */
  gobbleExpressions(untilICode) {
    let nodes = [], ch_i, node;
    while (this.index < this.expr.length) {
      ch_i = this.code;
      if (ch_i === _Jsep.SEMCOL_CODE || ch_i === _Jsep.COMMA_CODE) {
        this.index++;
      } else {
        if (node = this.gobbleExpression()) {
          nodes.push(node);
        } else if (this.index < this.expr.length) {
          if (ch_i === untilICode) {
            break;
          }
          this.throwError('Unexpected "' + this.char + '"');
        }
      }
    }
    return nodes;
  }
  /**
   * The main parsing function.
   * @returns {?jsep.Expression}
   */
  gobbleExpression() {
    const node = this.searchHook("gobble-expression") || this.gobbleBinaryExpression();
    this.gobbleSpaces();
    return this.runHook("after-expression", node);
  }
  /**
   * Search for the operation portion of the string (e.g. `+`, `===`)
   * Start by taking the longest possible binary operations (3 characters: `===`, `!==`, `>>>`)
   * and move down from 3 to 2 to 1 character until a matching binary operation is found
   * then, return that binary operation
   * @returns {string|boolean}
   */
  gobbleBinaryOp() {
    this.gobbleSpaces();
    let to_check = this.expr.substr(this.index, _Jsep.max_binop_len);
    let tc_len = to_check.length;
    while (tc_len > 0) {
      if (_Jsep.binary_ops.hasOwnProperty(to_check) && (!_Jsep.isIdentifierStart(this.code) || this.index + to_check.length < this.expr.length && !_Jsep.isIdentifierPart(this.expr.charCodeAt(this.index + to_check.length)))) {
        this.index += tc_len;
        return to_check;
      }
      to_check = to_check.substr(0, --tc_len);
    }
    return false;
  }
  /**
   * This function is responsible for gobbling an individual expression,
   * e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`
   * @returns {?jsep.BinaryExpression}
   */
  gobbleBinaryExpression() {
    let node, biop, prec, stack, biop_info, left, right, i, cur_biop;
    left = this.gobbleToken();
    if (!left) {
      return left;
    }
    biop = this.gobbleBinaryOp();
    if (!biop) {
      return left;
    }
    biop_info = {
      value: biop,
      prec: _Jsep.binaryPrecedence(biop),
      right_a: _Jsep.right_associative.has(biop)
    };
    right = this.gobbleToken();
    if (!right) {
      this.throwError("Expected expression after " + biop);
    }
    stack = [left, biop_info, right];
    while (biop = this.gobbleBinaryOp()) {
      prec = _Jsep.binaryPrecedence(biop);
      if (prec === 0) {
        this.index -= biop.length;
        break;
      }
      biop_info = {
        value: biop,
        prec,
        right_a: _Jsep.right_associative.has(biop)
      };
      cur_biop = biop;
      const comparePrev = (prev) => biop_info.right_a && prev.right_a ? prec > prev.prec : prec <= prev.prec;
      while (stack.length > 2 && comparePrev(stack[stack.length - 2])) {
        right = stack.pop();
        biop = stack.pop().value;
        left = stack.pop();
        node = {
          type: _Jsep.BINARY_EXP,
          operator: biop,
          left,
          right
        };
        stack.push(node);
      }
      node = this.gobbleToken();
      if (!node) {
        this.throwError("Expected expression after " + cur_biop);
      }
      stack.push(biop_info, node);
    }
    i = stack.length - 1;
    node = stack[i];
    while (i > 1) {
      node = {
        type: _Jsep.BINARY_EXP,
        operator: stack[i - 1].value,
        left: stack[i - 2],
        right: node
      };
      i -= 2;
    }
    return node;
  }
  /**
   * An individual part of a binary expression:
   * e.g. `foo.bar(baz)`, `1`, `"abc"`, `(a % 2)` (because it's in parenthesis)
   * @returns {boolean|jsep.Expression}
   */
  gobbleToken() {
    let ch, to_check, tc_len, node;
    this.gobbleSpaces();
    node = this.searchHook("gobble-token");
    if (node) {
      return this.runHook("after-token", node);
    }
    ch = this.code;
    if (_Jsep.isDecimalDigit(ch) || ch === _Jsep.PERIOD_CODE) {
      return this.gobbleNumericLiteral();
    }
    if (ch === _Jsep.SQUOTE_CODE || ch === _Jsep.DQUOTE_CODE) {
      node = this.gobbleStringLiteral();
    } else if (ch === _Jsep.OBRACK_CODE) {
      node = this.gobbleArray();
    } else {
      to_check = this.expr.substr(this.index, _Jsep.max_unop_len);
      tc_len = to_check.length;
      while (tc_len > 0) {
        if (_Jsep.unary_ops.hasOwnProperty(to_check) && (!_Jsep.isIdentifierStart(this.code) || this.index + to_check.length < this.expr.length && !_Jsep.isIdentifierPart(this.expr.charCodeAt(this.index + to_check.length)))) {
          this.index += tc_len;
          const argument = this.gobbleToken();
          if (!argument) {
            this.throwError("missing unaryOp argument");
          }
          return this.runHook("after-token", {
            type: _Jsep.UNARY_EXP,
            operator: to_check,
            argument,
            prefix: true
          });
        }
        to_check = to_check.substr(0, --tc_len);
      }
      if (_Jsep.isIdentifierStart(ch)) {
        node = this.gobbleIdentifier();
        if (_Jsep.literals.hasOwnProperty(node.name)) {
          node = {
            type: _Jsep.LITERAL,
            value: _Jsep.literals[node.name],
            raw: node.name
          };
        } else if (node.name === _Jsep.this_str) {
          node = {
            type: _Jsep.THIS_EXP
          };
        }
      } else if (ch === _Jsep.OPAREN_CODE) {
        node = this.gobbleGroup();
      }
    }
    if (!node) {
      return this.runHook("after-token", false);
    }
    node = this.gobbleTokenProperty(node);
    return this.runHook("after-token", node);
  }
  /**
   * Gobble properties of of identifiers/strings/arrays/groups.
   * e.g. `foo`, `bar.baz`, `foo['bar'].baz`
   * It also gobbles function calls:
   * e.g. `Math.acos(obj.angle)`
   * @param {jsep.Expression} node
   * @returns {jsep.Expression}
   */
  gobbleTokenProperty(node) {
    this.gobbleSpaces();
    let ch = this.code;
    while (ch === _Jsep.PERIOD_CODE || ch === _Jsep.OBRACK_CODE || ch === _Jsep.OPAREN_CODE || ch === _Jsep.QUMARK_CODE) {
      let optional;
      if (ch === _Jsep.QUMARK_CODE) {
        if (this.expr.charCodeAt(this.index + 1) !== _Jsep.PERIOD_CODE) {
          break;
        }
        optional = true;
        this.index += 2;
        this.gobbleSpaces();
        ch = this.code;
      }
      this.index++;
      if (ch === _Jsep.OBRACK_CODE) {
        node = {
          type: _Jsep.MEMBER_EXP,
          computed: true,
          object: node,
          property: this.gobbleExpression()
        };
        if (!node.property) {
          this.throwError('Unexpected "' + this.char + '"');
        }
        this.gobbleSpaces();
        ch = this.code;
        if (ch !== _Jsep.CBRACK_CODE) {
          this.throwError("Unclosed [");
        }
        this.index++;
      } else if (ch === _Jsep.OPAREN_CODE) {
        node = {
          type: _Jsep.CALL_EXP,
          "arguments": this.gobbleArguments(_Jsep.CPAREN_CODE),
          callee: node
        };
      } else if (ch === _Jsep.PERIOD_CODE || optional) {
        if (optional) {
          this.index--;
        }
        this.gobbleSpaces();
        node = {
          type: _Jsep.MEMBER_EXP,
          computed: false,
          object: node,
          property: this.gobbleIdentifier()
        };
      }
      if (optional) {
        node.optional = true;
      }
      this.gobbleSpaces();
      ch = this.code;
    }
    return node;
  }
  /**
   * Parse simple numeric literals: `12`, `3.4`, `.5`. Do this by using a string to
   * keep track of everything in the numeric literal and then calling `parseFloat` on that string
   * @returns {jsep.Literal}
   */
  gobbleNumericLiteral() {
    let number = "", ch, chCode;
    while (_Jsep.isDecimalDigit(this.code)) {
      number += this.expr.charAt(this.index++);
    }
    if (this.code === _Jsep.PERIOD_CODE) {
      number += this.expr.charAt(this.index++);
      while (_Jsep.isDecimalDigit(this.code)) {
        number += this.expr.charAt(this.index++);
      }
    }
    ch = this.char;
    if (ch === "e" || ch === "E") {
      number += this.expr.charAt(this.index++);
      ch = this.char;
      if (ch === "+" || ch === "-") {
        number += this.expr.charAt(this.index++);
      }
      while (_Jsep.isDecimalDigit(this.code)) {
        number += this.expr.charAt(this.index++);
      }
      if (!_Jsep.isDecimalDigit(this.expr.charCodeAt(this.index - 1))) {
        this.throwError("Expected exponent (" + number + this.char + ")");
      }
    }
    chCode = this.code;
    if (_Jsep.isIdentifierStart(chCode)) {
      this.throwError("Variable names cannot start with a number (" + number + this.char + ")");
    } else if (chCode === _Jsep.PERIOD_CODE || number.length === 1 && number.charCodeAt(0) === _Jsep.PERIOD_CODE) {
      this.throwError("Unexpected period");
    }
    return {
      type: _Jsep.LITERAL,
      value: parseFloat(number),
      raw: number
    };
  }
  /**
   * Parses a string literal, staring with single or double quotes with basic support for escape codes
   * e.g. `"hello world"`, `'this is\nJSEP'`
   * @returns {jsep.Literal}
   */
  gobbleStringLiteral() {
    let str = "";
    const startIndex = this.index;
    const quote = this.expr.charAt(this.index++);
    let closed = false;
    while (this.index < this.expr.length) {
      let ch = this.expr.charAt(this.index++);
      if (ch === quote) {
        closed = true;
        break;
      } else if (ch === "\\") {
        ch = this.expr.charAt(this.index++);
        switch (ch) {
          case "n":
            str += "\n";
            break;
          case "r":
            str += "\r";
            break;
          case "t":
            str += "	";
            break;
          case "b":
            str += "\b";
            break;
          case "f":
            str += "\f";
            break;
          case "v":
            str += "\v";
            break;
          default:
            str += ch;
        }
      } else {
        str += ch;
      }
    }
    if (!closed) {
      this.throwError('Unclosed quote after "' + str + '"');
    }
    return {
      type: _Jsep.LITERAL,
      value: str,
      raw: this.expr.substring(startIndex, this.index)
    };
  }
  /**
   * Gobbles only identifiers
   * e.g.: `foo`, `_value`, `$x1`
   * Also, this function checks if that identifier is a literal:
   * (e.g. `true`, `false`, `null`) or `this`
   * @returns {jsep.Identifier}
   */
  gobbleIdentifier() {
    let ch = this.code, start = this.index;
    if (_Jsep.isIdentifierStart(ch)) {
      this.index++;
    } else {
      this.throwError("Unexpected " + this.char);
    }
    while (this.index < this.expr.length) {
      ch = this.code;
      if (_Jsep.isIdentifierPart(ch)) {
        this.index++;
      } else {
        break;
      }
    }
    return {
      type: _Jsep.IDENTIFIER,
      name: this.expr.slice(start, this.index)
    };
  }
  /**
   * Gobbles a list of arguments within the context of a function call
   * or array literal. This function also assumes that the opening character
   * `(` or `[` has already been gobbled, and gobbles expressions and commas
   * until the terminator character `)` or `]` is encountered.
   * e.g. `foo(bar, baz)`, `my_func()`, or `[bar, baz]`
   * @param {number} termination
   * @returns {jsep.Expression[]}
   */
  gobbleArguments(termination) {
    const args = [];
    let closed = false;
    let separator_count = 0;
    while (this.index < this.expr.length) {
      this.gobbleSpaces();
      let ch_i = this.code;
      if (ch_i === termination) {
        closed = true;
        this.index++;
        if (termination === _Jsep.CPAREN_CODE && separator_count && separator_count >= args.length) {
          this.throwError("Unexpected token " + String.fromCharCode(termination));
        }
        break;
      } else if (ch_i === _Jsep.COMMA_CODE) {
        this.index++;
        separator_count++;
        if (separator_count !== args.length) {
          if (termination === _Jsep.CPAREN_CODE) {
            this.throwError("Unexpected token ,");
          } else if (termination === _Jsep.CBRACK_CODE) {
            for (let arg = args.length; arg < separator_count; arg++) {
              args.push(null);
            }
          }
        }
      } else if (args.length !== separator_count && separator_count !== 0) {
        this.throwError("Expected comma");
      } else {
        const node = this.gobbleExpression();
        if (!node || node.type === _Jsep.COMPOUND) {
          this.throwError("Expected comma");
        }
        args.push(node);
      }
    }
    if (!closed) {
      this.throwError("Expected " + String.fromCharCode(termination));
    }
    return args;
  }
  /**
   * Responsible for parsing a group of things within parentheses `()`
   * that have no identifier in front (so not a function call)
   * This function assumes that it needs to gobble the opening parenthesis
   * and then tries to gobble everything within that parenthesis, assuming
   * that the next thing it should see is the close parenthesis. If not,
   * then the expression probably doesn't have a `)`
   * @returns {boolean|jsep.Expression}
   */
  gobbleGroup() {
    this.index++;
    let nodes = this.gobbleExpressions(_Jsep.CPAREN_CODE);
    if (this.code === _Jsep.CPAREN_CODE) {
      this.index++;
      if (nodes.length === 1) {
        return nodes[0];
      } else if (!nodes.length) {
        return false;
      } else {
        return {
          type: _Jsep.SEQUENCE_EXP,
          expressions: nodes
        };
      }
    } else {
      this.throwError("Unclosed (");
    }
  }
  /**
   * Responsible for parsing Array literals `[1, 2, 3]`
   * This function assumes that it needs to gobble the opening bracket
   * and then tries to gobble the expressions as arguments.
   * @returns {jsep.ArrayExpression}
   */
  gobbleArray() {
    this.index++;
    return {
      type: _Jsep.ARRAY_EXP,
      elements: this.gobbleArguments(_Jsep.CBRACK_CODE)
    };
  }
};
var hooks = new Hooks();
Object.assign(Jsep, {
  hooks,
  plugins: new Plugins(Jsep),
  // Node Types
  // ----------
  // This is the full set of types that any JSEP node can be.
  // Store them here to save space when minified
  COMPOUND: "Compound",
  SEQUENCE_EXP: "SequenceExpression",
  IDENTIFIER: "Identifier",
  MEMBER_EXP: "MemberExpression",
  LITERAL: "Literal",
  THIS_EXP: "ThisExpression",
  CALL_EXP: "CallExpression",
  UNARY_EXP: "UnaryExpression",
  BINARY_EXP: "BinaryExpression",
  ARRAY_EXP: "ArrayExpression",
  TAB_CODE: 9,
  LF_CODE: 10,
  CR_CODE: 13,
  SPACE_CODE: 32,
  PERIOD_CODE: 46,
  // '.'
  COMMA_CODE: 44,
  // ','
  SQUOTE_CODE: 39,
  // single quote
  DQUOTE_CODE: 34,
  // double quotes
  OPAREN_CODE: 40,
  // (
  CPAREN_CODE: 41,
  // )
  OBRACK_CODE: 91,
  // [
  CBRACK_CODE: 93,
  // ]
  QUMARK_CODE: 63,
  // ?
  SEMCOL_CODE: 59,
  // ;
  COLON_CODE: 58,
  // :
  // Operations
  // ----------
  // Use a quickly-accessible map to store all of the unary operators
  // Values are set to `1` (it really doesn't matter)
  unary_ops: {
    "-": 1,
    "!": 1,
    "~": 1,
    "+": 1
  },
  // Also use a map for the binary operations but set their values to their
  // binary precedence for quick reference (higher number = higher precedence)
  // see [Order of operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
  binary_ops: {
    "||": 1,
    "??": 1,
    "&&": 2,
    "|": 3,
    "^": 4,
    "&": 5,
    "==": 6,
    "!=": 6,
    "===": 6,
    "!==": 6,
    "<": 7,
    ">": 7,
    "<=": 7,
    ">=": 7,
    "<<": 8,
    ">>": 8,
    ">>>": 8,
    "+": 9,
    "-": 9,
    "*": 10,
    "/": 10,
    "%": 10,
    "**": 11
  },
  // sets specific binary_ops as right-associative
  right_associative: /* @__PURE__ */ new Set(["**"]),
  // Additional valid identifier chars, apart from a-z, A-Z and 0-9 (except on the starting char)
  additional_identifier_chars: /* @__PURE__ */ new Set(["$", "_"]),
  // Literals
  // ----------
  // Store the values to return for the various literals we may encounter
  literals: {
    "true": true,
    "false": false,
    "null": null
  },
  // Except for `this`, which is special. This could be changed to something like `'self'` as well
  this_str: "this"
});
Jsep.max_unop_len = Jsep.getMaxKeyLen(Jsep.unary_ops);
Jsep.max_binop_len = Jsep.getMaxKeyLen(Jsep.binary_ops);
var jsep = (expr) => new Jsep(expr).parse();
var stdClassProps = Object.getOwnPropertyNames(class Test {
});
Object.getOwnPropertyNames(Jsep).filter((prop) => !stdClassProps.includes(prop) && jsep[prop] === void 0).forEach((m) => {
  jsep[m] = Jsep[m];
});
jsep.Jsep = Jsep;
var CONDITIONAL_EXP = "ConditionalExpression";
var ternary = {
  name: "ternary",
  init(jsep2) {
    jsep2.hooks.add("after-expression", function gobbleTernary(env) {
      if (env.node && this.code === jsep2.QUMARK_CODE) {
        this.index++;
        const test = env.node;
        const consequent = this.gobbleExpression();
        if (!consequent) {
          this.throwError("Expected expression");
        }
        this.gobbleSpaces();
        if (this.code === jsep2.COLON_CODE) {
          this.index++;
          const alternate = this.gobbleExpression();
          if (!alternate) {
            this.throwError("Expected expression");
          }
          env.node = {
            type: CONDITIONAL_EXP,
            test,
            consequent,
            alternate
          };
          if (test.operator && jsep2.binary_ops[test.operator] <= 0.9) {
            let newTest = test;
            while (newTest.right.operator && jsep2.binary_ops[newTest.right.operator] <= 0.9) {
              newTest = newTest.right;
            }
            env.node.test = newTest.right;
            newTest.right = env.node;
            env.node = test;
          }
        } else {
          this.throwError("Expected :");
        }
      }
    });
  }
};
jsep.plugins.register(ternary);
var FSLASH_CODE = 47;
var BSLASH_CODE = 92;
var index = {
  name: "regex",
  init(jsep2) {
    jsep2.hooks.add("gobble-token", function gobbleRegexLiteral(env) {
      if (this.code === FSLASH_CODE) {
        const patternIndex = ++this.index;
        let inCharSet = false;
        while (this.index < this.expr.length) {
          if (this.code === FSLASH_CODE && !inCharSet) {
            const pattern = this.expr.slice(patternIndex, this.index);
            let flags = "";
            while (++this.index < this.expr.length) {
              const code = this.code;
              if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57) {
                flags += this.char;
              } else {
                break;
              }
            }
            let value;
            try {
              value = new RegExp(pattern, flags);
            } catch (e) {
              this.throwError(e.message);
            }
            env.node = {
              type: jsep2.LITERAL,
              value,
              raw: this.expr.slice(patternIndex - 1, this.index)
            };
            env.node = this.gobbleTokenProperty(env.node);
            return env.node;
          }
          if (this.code === jsep2.OBRACK_CODE) {
            inCharSet = true;
          } else if (inCharSet && this.code === jsep2.CBRACK_CODE) {
            inCharSet = false;
          }
          this.index += this.code === BSLASH_CODE ? 2 : 1;
        }
        this.throwError("Unclosed Regex");
      }
    });
  }
};
var PLUS_CODE = 43;
var MINUS_CODE = 45;
var plugin = {
  name: "assignment",
  assignmentOperators: /* @__PURE__ */ new Set(["=", "*=", "**=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|=", "||=", "&&=", "??="]),
  updateOperators: [PLUS_CODE, MINUS_CODE],
  assignmentPrecedence: 0.9,
  init(jsep2) {
    const updateNodeTypes = [jsep2.IDENTIFIER, jsep2.MEMBER_EXP];
    plugin.assignmentOperators.forEach((op) => jsep2.addBinaryOp(op, plugin.assignmentPrecedence, true));
    jsep2.hooks.add("gobble-token", function gobbleUpdatePrefix(env) {
      const code = this.code;
      if (plugin.updateOperators.some((c) => c === code && c === this.expr.charCodeAt(this.index + 1))) {
        this.index += 2;
        env.node = {
          type: "UpdateExpression",
          operator: code === PLUS_CODE ? "++" : "--",
          argument: this.gobbleTokenProperty(this.gobbleIdentifier()),
          prefix: true
        };
        if (!env.node.argument || !updateNodeTypes.includes(env.node.argument.type)) {
          this.throwError(`Unexpected ${env.node.operator}`);
        }
      }
    });
    jsep2.hooks.add("after-token", function gobbleUpdatePostfix(env) {
      if (env.node) {
        const code = this.code;
        if (plugin.updateOperators.some((c) => c === code && c === this.expr.charCodeAt(this.index + 1))) {
          if (!updateNodeTypes.includes(env.node.type)) {
            this.throwError(`Unexpected ${env.node.operator}`);
          }
          this.index += 2;
          env.node = {
            type: "UpdateExpression",
            operator: code === PLUS_CODE ? "++" : "--",
            argument: env.node,
            prefix: false
          };
        }
      }
    });
    jsep2.hooks.add("after-expression", function gobbleAssignment(env) {
      if (env.node) {
        updateBinariesToAssignments(env.node);
      }
    });
    function updateBinariesToAssignments(node) {
      if (plugin.assignmentOperators.has(node.operator)) {
        node.type = "AssignmentExpression";
        updateBinariesToAssignments(node.left);
        updateBinariesToAssignments(node.right);
      } else if (!node.operator) {
        Object.values(node).forEach((val) => {
          if (val && typeof val === "object") {
            updateBinariesToAssignments(val);
          }
        });
      }
    }
  }
};
jsep.plugins.register(index, plugin);
jsep.addUnaryOp("typeof");
jsep.addUnaryOp("void");
jsep.addLiteral("null", null);
jsep.addLiteral("undefined", void 0);
var BLOCKED_PROTO_PROPERTIES = /* @__PURE__ */ new Set(["constructor", "__proto__", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);
var BLOCKED_FUNCTIONS = new WeakSet([
  Function,
  // eslint-disable-next-line no-empty-function -- Only need the constructor
  function* () {
  }.constructor,
  // eslint-disable-next-line no-empty-function -- Only need the constructor
  async function() {
  }.constructor,
  // eslint-disable-next-line no-empty-function -- Only need the constructor
  async function* () {
  }.constructor,
  Function.prototype.call,
  Function.prototype.apply,
  Function.prototype.bind,
  Reflect.apply,
  Reflect.construct,
  ...[...BLOCKED_PROTO_PROPERTIES].map((name) => Reflect.get(Object.prototype, name)).filter((value) => typeof value === "function")
]);
var isBlockedFunction = (value) => {
  return typeof value === "function" && BLOCKED_FUNCTIONS.has(value);
};
var getSafeProperty = (obj, prop) => {
  if (obj === void 0 || obj === null) {
    throw new TypeError(`Cannot read properties of ${obj} (reading '${prop}')`);
  }
  if (!Object.hasOwn(obj, prop) && BLOCKED_PROTO_PROPERTIES.has(prop)) {
    throw new TypeError(`Cannot read properties of ${obj} (reading '${prop}')`);
  }
  const result = (
    /** @type {Record<string, UnknownResult>} */
    obj[prop]
  );
  if (isBlockedFunction(result)) {
    throw new TypeError("Function constructor is disabled");
  }
  return result;
};
var BINOPS = Object.assign(
  /* @__PURE__ */ Object.create(null),
  /** @type {OperatorTable} */
  {
    "||": (a, b) => a || b(),
    "??": (a, b) => a ?? b(),
    "&&": (a, b) => a && b(),
    "|": (a, b) => a | b(),
    "^": (a, b) => a ^ b(),
    "&": (a, b) => a & b(),
    // eslint-disable-next-line eqeqeq -- API
    "==": (a, b) => a == b(),
    // eslint-disable-next-line eqeqeq -- API
    "!=": (a, b) => a != b(),
    "===": (a, b) => a === b(),
    "!==": (a, b) => a !== b(),
    "<": (a, b) => a < b(),
    ">": (a, b) => a > b(),
    "<=": (a, b) => a <= b(),
    ">=": (a, b) => a >= b(),
    "<<": (a, b) => a << b(),
    ">>": (a, b) => a >> b(),
    ">>>": (a, b) => a >>> b(),
    "+": (a, b) => a + b(),
    "-": (a, b) => a - b(),
    "*": (a, b) => a * b(),
    "/": (a, b) => a / b(),
    "%": (a, b) => a % b(),
    "**": (a, b) => a ** b()
  }
);
var UNOPS = Object.assign(
  /* @__PURE__ */ Object.create(null),
  /** @type {UnaryOperatorTable} */
  {
    "-": (a) => -/** @type {EvaluatedResult} */
    a,
    "!": (a) => !a,
    "~": (a) => ~/** @type {EvaluatedResult} */
    a,
    // eslint-disable-next-line no-implicit-coercion -- API
    "+": (a) => +/** @type {EvaluatedResult} */
    a,
    typeof: (a) => typeof a,
    void: () => void 0
  }
);
var SafeEval = {
  /**
   * @param {jsep.Expression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalAst(ast, subs) {
    switch (ast.type) {
      case "BinaryExpression":
      case "LogicalExpression":
        return SafeEval.evalBinaryExpression(
          /** @type {jsep.BinaryExpression} */
          ast,
          subs
        );
      case "Compound":
        return SafeEval.evalCompound(
          /** @type {jsep.Compound} */
          ast,
          subs
        );
      case "ConditionalExpression":
        return SafeEval.evalConditionalExpression(
          /** @type {jsep.ConditionalExpression} */
          ast,
          subs
        );
      case "Identifier":
        return SafeEval.evalIdentifier(
          /** @type {jsep.Identifier} */
          ast,
          subs
        );
      case "Literal":
        return SafeEval.evalLiteral(
          /** @type {jsep.Literal} */
          ast
        );
      case "MemberExpression":
        return SafeEval.evalMemberExpression(
          /** @type {jsep.MemberExpression} */
          ast,
          subs
        );
      case "UnaryExpression":
        return SafeEval.evalUnaryExpression(
          /** @type {jsep.UnaryExpression} */
          ast,
          subs
        );
      case "ArrayExpression":
        return SafeEval.evalArrayExpression(
          /** @type {jsep.ArrayExpression} */
          ast,
          subs
        );
      case "CallExpression":
        return SafeEval.evalCallExpression(
          /** @type {jsep.CallExpression} */
          ast,
          subs
        );
      case "AssignmentExpression":
        return SafeEval.evalAssignmentExpression(
          /** @type {AssignmentExpression} */
          ast,
          subs
        );
      default:
        throw new SyntaxError("Unexpected expression", {
          cause: ast
        });
    }
  },
  /**
   * @param {jsep.BinaryExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalBinaryExpression(ast, subs) {
    if (!Object.hasOwn(BINOPS, ast.operator)) {
      throw new SyntaxError(`Unknown binary operator: ${ast.operator}`);
    }
    const result = BINOPS[ast.operator](SafeEval.evalAst(ast.left, subs), () => SafeEval.evalAst(ast.right, subs));
    return result;
  },
  /**
   * @param {jsep.Compound} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalCompound(ast, subs) {
    let last;
    for (let i = 0; i < ast.body.length; i++) {
      if (ast.body[i].type === "Identifier" && ["var", "let", "const"].includes(
        /** @type {jsep.Identifier} */
        ast.body[i].name
      ) && Object.hasOwn(ast.body, i + 1) && ast.body[i + 1].type === "AssignmentExpression") {
        i += 1;
      }
      const expr = ast.body[i];
      last = SafeEval.evalAst(expr, subs);
    }
    return last;
  },
  /**
   * @param {jsep.ConditionalExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalConditionalExpression(ast, subs) {
    return SafeEval.evalAst(ast.test, subs) ? SafeEval.evalAst(ast.consequent, subs) : SafeEval.evalAst(ast.alternate, subs);
  },
  /**
   * @param {jsep.Identifier} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalIdentifier(ast, subs) {
    if (Object.hasOwn(subs, ast.name)) {
      return subs[ast.name];
    }
    throw new ReferenceError(`${ast.name} is not defined`);
  },
  /**
   * @param {jsep.Literal} ast
   * @returns {UnknownResult}
   */
  evalLiteral(ast) {
    return ast.value;
  },
  /**
   * @param {jsep.MemberExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalMemberExpression(ast, subs) {
    const prop = String(
      // NOTE: `String(value)` throws error when
      // value has overwritten the toString method to return non-string
      // i.e. `value = {toString: () => []}`
      ast.computed ? SafeEval.evalAst(ast.property, subs) : ast.property.name
      // `object.property` property is Identifier
    );
    const obj = SafeEval.evalAst(ast.object, subs);
    const result = getSafeProperty(obj, prop);
    if (typeof result === "function") {
      return result.bind(obj);
    }
    return result;
  },
  /**
   * @param {jsep.UnaryExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalUnaryExpression(ast, subs) {
    if (!Object.hasOwn(UNOPS, ast.operator)) {
      throw new SyntaxError(`Unknown unary operator: ${ast.operator}`);
    }
    const operand = SafeEval.evalAst(ast.argument, subs);
    return UNOPS[ast.operator](operand);
  },
  /**
   * @param {jsep.ArrayExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalArrayExpression(ast, subs) {
    return ast.elements.map((el) => SafeEval.evalAst(
      /** @type {jsep.Expression} */
      el,
      subs
    ));
  },
  /**
   * @param {jsep.CallExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalCallExpression(ast, subs) {
    const args = ast.arguments.map((arg) => SafeEval.evalAst(arg, subs));
    const func = SafeEval.evalAst(ast.callee, subs);
    if (isBlockedFunction(func) || args.some((arg) => isBlockedFunction(arg))) {
      throw new Error("Function constructor is disabled");
    }
    return (
      /** @type {(...args: AnyParameter[]) => UnknownResult} */
      func(...args)
    );
  },
  /**
   * @param {AssignmentExpression} ast
   * @param {Substitutions} subs
   * @returns {UnknownResult}
   */
  evalAssignmentExpression(ast, subs) {
    if (ast.left.type !== "Identifier") {
      throw new SyntaxError("Invalid left-hand side in assignment");
    }
    const id2 = (
      /** @type {jsep.Identifier} */
      ast.left.name
    );
    const value = SafeEval.evalAst(ast.right, subs);
    subs[id2] = value;
    return subs[id2];
  }
};
var SafeScript = class {
  /**
   * @param {string} expr Expression to evaluate
   */
  constructor(expr) {
    this.code = expr;
    this.ast = /** @type {unknown} */
    jsep(this.code);
  }
  /**
   * @param {object} context Object whose items will be added
   *   to evaluation
   * @returns {EvaluatedResult} Result of evaluated code
   */
  runInNewContext(context) {
    const keyMap = Object.assign(/* @__PURE__ */ Object.create(null), context);
    return SafeEval.evalAst(
      /** @type {jsep.Expression} */
      this.ast,
      keyMap
    );
  }
};
var toStringTag = (val) => {
  return Object.prototype.toString.call(val).slice(8, -1);
};
var scriptCache = /* @__PURE__ */ new Map();
var pathCache = /* @__PURE__ */ new Map();
function push(arr, item) {
  arr = arr.slice();
  arr.push(item);
  return arr;
}
function unshift(item, arr) {
  arr = arr.slice();
  arr.unshift(item);
  return arr;
}
function JSONPath(opts, expr, obj, callback, otherTypeCallback) {
  try {
    if (opts && typeof opts === "object") {
      return new JSONPathClass(opts);
    }
    return new JSONPathClass(
      opts,
      expr,
      /** @type {JSONPathCallback|undefined} */
      obj,
      /** @type {OtherTypeCallback|undefined} */
      callback,
      /** @type {undefined} */
      otherTypeCallback
    );
  } catch (e) {
    if (new.target) {
      throw e;
    }
    if (e && typeof e === "object" && "value" in e) {
      return (
        /** @type {{value: UnknownResult}} */
        e.value
      );
    }
    throw e;
  }
}
var JSONPathClass = class {
  /**
   * @overload
   * @param {string} opts JSON path to evaluate
   * @param {AnyInput} [expr] JSON object to evaluate against
   * @param {JSONPathCallback} [obj] Passed 3 arguments: 1) desired
   *     payload per `resultType`, 2) `"value"|"property"`, 3) Full returned
   *     object with all payloads
   * @param {OtherTypeCallback} [callback] If `@other()` is at the
   *   end of one's query, this will be invoked with the value of the item,
   *   its path, its parent, and its parent's property name, and it should
   *   return a boolean indicating whether the supplied value belongs to the
   *   "other" type or not (or it may handle transformations and return
   *   `false`).
   * @param {undefined} [otherTypeCallback]
   */
  /**
   * @overload
   * @param {JSONPathOptions} opts If a string, will be treated as
   *   `expr`
   */
  /**
   * @param {null|string|JSONPathOptions} opts If a string, will be treated as
   *   `expr`
   * @param {string|AnyInput} [expr] JSON path to evaluate
   * @param {AnyInput|JSONPathCallback} [obj] JSON object to evaluate against
   * @param {JSONPathCallback|OtherTypeCallback} [callback] Passed 3
   *     arguments: 1) desired payload per `resultType`,
   *     2) `"value"|"property"`, 3) Full returned
   *     object with all payloads
   * @param {OtherTypeCallback} [otherTypeCallback] If `@other()` is at the
   *   end of one's query, this will be invoked with the value of the item,
   *   its path, its parent, and its parent's property name, and it should
   *   return a boolean indicating whether the supplied value belongs to the
   *   "other" type or not (or it may handle transformations and return
   *   `false`).
   */
  constructor(opts, expr, obj, callback, otherTypeCallback) {
    if (typeof opts === "string") {
      otherTypeCallback = /** @type {OtherTypeCallback} */
      callback;
      callback = /** @type {JSONPathCallback} */
      obj;
      obj = expr;
      expr = opts;
      opts = null;
    }
    const optObj = opts && typeof opts === "object";
    opts ||= /** @type {JSONPathOptions} */
    {};
    this.currResultType = void 0;
    this.currEval = void 0;
    this.currOtherTypeCallback = void 0;
    this.currCustomTypes = void 0;
    this.currSandbox = void 0;
    this._hasParentSelector = false;
    this.json = opts.json || obj;
    this.path = opts.path || expr;
    this.resultType = opts.resultType || "value";
    this.flatten = Object.hasOwn(opts, "flatten") && opts.flatten;
    this.wrap = !Object.hasOwn(opts, "wrap") || opts.wrap;
    this.sandbox = opts.sandbox || {};
    this.eval = opts.eval === void 0 ? "safe" : opts.eval;
    this.ignoreEvalErrors = typeof opts.ignoreEvalErrors !== "undefined" && opts.ignoreEvalErrors;
    this.parent = Object.hasOwn(opts, "parent") ? opts.parent : null;
    this.parentProperty = Object.hasOwn(opts, "parentProperty") ? opts.parentProperty : null;
    this.callback = opts.callback || /** @type {JSONPathCallback} */
    callback || null;
    this.otherTypeCallback = opts.otherTypeCallback || otherTypeCallback || function() {
      throw new TypeError("You must supply an otherTypeCallback callback option with the @other() operator.");
    };
    this.customTypes = opts.customTypes || {};
    if (opts.autostart === false) {
      return;
    }
    const args = (
      /** @type {JSONPathOptions} */
      {
        path: optObj ? opts.path : expr
      }
    );
    if (!optObj && obj !== void 0) {
      args.json = obj;
    } else if ("json" in opts) {
      args.json = opts.json;
    }
    const ret = this.evaluate(args);
    if (!ret || typeof ret !== "object") {
      const err = (
        /** @type {Error & {value: UnknownResult}} */
        new Error('JSONPath should not be called with "new" (it prevents return of (unwrapped) scalar values)')
      );
      err.value = ret;
      throw err;
    }
    return ret;
  }
  // PUBLIC METHODS
  /**
   * @overload
   * @param {JSONPathOptions} [expr]
   * @returns {ReturnObject|ReturnObject[]|undefined|unknown}
   */
  /**
   * @overload
   * @param {PathType|undefined} [expr]
   * @param {AnyInput} [json]
   * @param {JSONPathCallback|null} [callback]
   * @param {OtherTypeCallback} [otherTypeCallback]
   * @returns {ReturnObject|ReturnObject[]|undefined|unknown}
   */
  /**
   * @param {PathType|JSONPathOptions|undefined} [expr]
   * @param {AnyInput} [json]
   * @param {JSONPathCallback|null} [callback]
   * @param {OtherTypeCallback} [otherTypeCallback]
   * @returns {ReturnObject|ReturnObject[]|undefined|unknown}
   */
  evaluate(expr, json, callback, otherTypeCallback) {
    let currParent = this.parent, currParentProperty = this.parentProperty;
    let {
      flatten,
      wrap
    } = this;
    this.currResultType = this.resultType;
    this.currEval = this.eval;
    this.currSandbox = this.sandbox;
    callback ||= this.callback;
    this.currOtherTypeCallback = otherTypeCallback || this.otherTypeCallback;
    this.currCustomTypes = this.customTypes;
    if (expr && typeof expr === "object" && !Array.isArray(expr)) {
      const exprObj = expr;
      if (!exprObj.path && exprObj.path !== "") {
        throw new TypeError('You must supply a "path" property when providing an object argument to JSONPath.evaluate().');
      }
      if (!Object.hasOwn(exprObj, "json")) {
        throw new TypeError('You must supply a "json" property when providing an object argument to JSONPath.evaluate().');
      }
      ({
        json
      } = exprObj);
      flatten = Object.hasOwn(exprObj, "flatten") ? exprObj.flatten : flatten;
      this.currResultType = Object.hasOwn(exprObj, "resultType") ? exprObj.resultType : this.currResultType;
      this.currSandbox = Object.hasOwn(exprObj, "sandbox") ? exprObj.sandbox : this.currSandbox;
      wrap = Object.hasOwn(exprObj, "wrap") ? exprObj.wrap : wrap;
      this.currEval = Object.hasOwn(exprObj, "eval") ? exprObj.eval : this.currEval;
      callback = Object.hasOwn(exprObj, "callback") ? exprObj.callback : callback;
      this.currOtherTypeCallback = Object.hasOwn(exprObj, "otherTypeCallback") ? exprObj.otherTypeCallback : this.currOtherTypeCallback;
      this.currCustomTypes = Object.hasOwn(exprObj, "customTypes") ? exprObj.customTypes : this.currCustomTypes;
      currParent = Object.hasOwn(exprObj, "parent") ? exprObj.parent : currParent;
      currParentProperty = Object.hasOwn(exprObj, "parentProperty") ? exprObj.parentProperty : currParentProperty;
      expr = exprObj.path;
    } else {
      json ||= this.json;
      expr ||= this.path;
    }
    currParent ||= null;
    currParentProperty ||= null;
    if (Array.isArray(expr)) {
      expr = JSONPath.toPathString(expr);
    }
    if (!json || !expr && expr !== "") {
      return void 0;
    }
    const exprList = JSONPath.toPathArray(
      /** @type {string} */
      expr
    );
    if (exprList[0] === "$" && exprList.length > 1) {
      exprList.shift();
    }
    this._hasParentSelector = false;
    const traceResult = this._trace(exprList, json, ["$"], currParent, currParentProperty, callback ?? void 0, void 0);
    const result = (Array.isArray(traceResult) ? traceResult : [traceResult]).filter((ea) => {
      return ea && !ea.isParentSelector;
    });
    if (!result.length) {
      return wrap ? [] : void 0;
    }
    if (!wrap && result.length === 1 && !result[0].hasArrExpr) {
      const preferredOutput = this._getPreferredOutput(result[0]);
      return preferredOutput;
    }
    const reduced = result.reduce(
      (rslt, ea) => {
        const valOrPath = this._getPreferredOutput(ea);
        if (flatten && Array.isArray(valOrPath)) {
          rslt = rslt.concat(valOrPath);
        } else {
          rslt.push(valOrPath);
        }
        return rslt;
      },
      /** @type {UnknownResult[]} */
      []
    );
    return reduced;
  }
  // PRIVATE METHODS
  /**
   * @param {ReturnObject} ea
   * @returns {PreferredOutput}
   */
  _getPreferredOutput(ea) {
    const resultType = this.currResultType;
    switch (resultType) {
      case "all": {
        const path = Array.isArray(ea.path) ? ea.path : JSONPath.toPathArray(ea.path);
        ea.pointer = JSONPath.toPointer(
          /** @type {string[]} */
          path
        );
        ea.path = typeof ea.path === "string" ? ea.path : JSONPath.toPathString(
          /** @type {string[]} */
          ea.path
        );
        return ea;
      }
      case "value":
      case "parent":
      case "parentProperty":
        return (
          /** @type {PreferredOutput} */
          ea[resultType]
        );
      case "path":
        if (typeof ea.path === "string") {
          return ea.path;
        }
        return JSONPath.toPathString(
          /** @type {string[]} */
          ea.path
        );
      case "pointer": {
        const pathArray = Array.isArray(ea.path) ? ea.path : JSONPath.toPathArray(ea.path);
        return JSONPath.toPointer(
          /** @type {string[]} */
          pathArray
        );
      }
      default:
        throw new TypeError("Unknown result type");
    }
  }
  /**
   * @param {ReturnObject} fullRetObj
   * @param {JSONPathCallback|undefined} callback
   * @param {"value"|"property"} type
   * @returns {void}
   */
  _handleCallback(fullRetObj, callback, type) {
    if (!callback) {
      return;
    }
    const preferredOutput = this._getPreferredOutput(fullRetObj);
    if (Array.isArray(fullRetObj.path)) {
      fullRetObj.path = JSONPath.toPathString(
        /** @type {string[]} */
        fullRetObj.path
      );
    }
    callback(preferredOutput, type, fullRetObj);
  }
  /**
   *
   * @param {ExpressionArray} expr
   * @param {unknown} val
   * @param {ExpressionArray} path
   * @param {ParentValue} parent
   * @param {ParentProperty} parentPropName
   * @param {JSONPathCallback|undefined} callback
   * @param {boolean|undefined} hasArrExpr
   * @param {boolean} [literalPriority]
   * @returns {ReturnObject|ReturnObject[]}
   */
  _trace(expr, val, path, parent, parentPropName, callback, hasArrExpr, literalPriority) {
    let retObj;
    if (!expr.length) {
      retObj = {
        path,
        value: val,
        parent,
        parentProperty: parentPropName,
        hasArrExpr
      };
      this._handleCallback(retObj, callback, "value");
      return retObj;
    }
    const loc = (
      /** @type {string} */
      expr[0]
    ), x = expr.slice(1);
    const ret = [];
    function addRet(elems) {
      if (Array.isArray(elems)) {
        elems.forEach((t) => {
          ret.push(t);
        });
      } else {
        ret.push(elems);
      }
    }
    if (val && (typeof loc !== "string" || literalPriority) && Object.hasOwn(
      val,
      /** @type {PropertyKey} */
      loc
    )) {
      const valObj = (
        /** @type {Record<string, unknown>} */
        val
      );
      addRet(this._trace(
        x,
        valObj[
          /** @type {string} */
          loc
        ],
        push(path, loc),
        val,
        /** @type {string|number} */
        loc,
        callback,
        hasArrExpr
      ));
    } else if (loc === "*") {
      this._walk(val, (m) => {
        const valObj = (
          /** @type {Record<string, unknown>} */
          val
        );
        addRet(this._trace(x, valObj[m], push(path, m), val, m, callback, true, true));
      });
    } else if (loc === "..") {
      addRet(this._trace(x, val, path, parent, parentPropName, callback, hasArrExpr));
      this._walk(val, (m) => {
        const valObj = (
          /** @type {Record<string, unknown>} */
          val
        );
        if (typeof valObj[m] === "object") {
          addRet(this._trace(expr.slice(), valObj[m], push(path, m), val, m, callback, true));
        }
      });
    } else if (loc === "^") {
      this._hasParentSelector = true;
      return (
        /** @type {ReturnObject} */
        {
          path: path.slice(0, -1),
          expr: x,
          isParentSelector: true,
          value: void 0,
          parent: void 0,
          parentProperty: null
        }
      );
    } else if (loc === "~") {
      retObj = {
        path: push(path, loc),
        value: parentPropName,
        parent,
        parentProperty: null
      };
      this._handleCallback(retObj, callback, "property");
      return retObj;
    } else if (loc === "$") {
      addRet(this._trace(x, val, path, null, null, callback, hasArrExpr));
    } else if (new RegExp("^(-?\\d*):(-?\\d*):?(\\d*)$", "v").test(loc)) {
      const sliceResult = this._slice(loc, x, val, path, parent, parentPropName, callback);
      if (sliceResult) {
        addRet(sliceResult);
      }
    } else if (loc.indexOf("?(") === 0) {
      if (this.currEval === false) {
        throw new Error("Eval [?(expr)] prevented in JSONPath expression.");
      }
      const safeLoc = loc.replace(new RegExp("^\\?\\((.*?)\\)$", "v"), "$1");
      const nested = new RegExp("@.?([^?]*)[\\['](\\??\\(.*?\\))(?!.\\)\\])[\\]']", "gv").exec(safeLoc);
      if (nested) {
        this._walk(val, (m) => {
          const npath = [nested[2]];
          const valObj2 = (
            /** @type {Record<string, unknown>} */
            val
          );
          const nvalue = (
            /** @type {ValueType} */
            nested[1] ? getSafeProperty(
              /** @type {Record<string, unknown>} */
              valObj2[m],
              nested[1]
            ) : valObj2[m]
          );
          const filterResults = this._trace(npath, nvalue, path, parent, parentPropName, callback, true);
          const filterArray = Array.isArray(filterResults) ? filterResults : [filterResults];
          if (filterArray.length > 0) {
            addRet(this._trace(x, valObj2[m], push(path, m), val, m, callback, true));
          }
        });
      } else {
        const valObj3 = (
          /** @type {Record<string, unknown>} */
          val
        );
        this._walk(val, (m) => {
          if (this._eval(safeLoc, valObj3[m], m, path, parent, parentPropName)) {
            addRet(this._trace(x, valObj3[m], push(path, m), val, m, callback, true));
          }
        });
      }
    } else if (loc[0] === "(") {
      if (this.currEval === false) {
        throw new Error("Eval [(expr)] prevented in JSONPath expression.");
      }
      const evalResult = this._eval(
        /** @type {string} */
        loc,
        val,
        /** @type {string|number} */
        path.at(-1),
        path.slice(0, -1),
        parent,
        parentPropName
      );
      const exprToUse = (
        /** @type {string|number} */
        evalResult !== void 0 ? evalResult : ""
      );
      addRet(this._trace(unshift(exprToUse, x), val, path, parent, parentPropName, callback, hasArrExpr));
    } else if (loc[0] === "@") {
      let addType = false;
      const parenthIndex = loc.indexOf("(");
      const valueType = (
        /** @type {ValueType|string} */
        loc.slice(1, parenthIndex)
      );
      const lastParenth = loc.lastIndexOf(")");
      const argRaw = loc.slice(parenthIndex + 1, lastParenth);
      const arg = argRaw ? JSON.parse(argRaw) : void 0;
      switch (valueType) {
        case "scalar":
          addType = !val || !["object", "function"].includes(typeof val);
          break;
        case "boolean":
        case "string":
        case "undefined":
        case "function":
          addType = typeof val === valueType;
          break;
        case "integer":
          addType = Number.isFinite(val) && !/** @type {number} */
          (val % 1);
          break;
        case "number":
          addType = Number.isFinite(val);
          break;
        case "nonFinite":
          addType = typeof val === "number" && !Number.isFinite(val);
          break;
        case "object":
          addType = Boolean(val) && typeof val === valueType;
          break;
        case "array":
          addType = Array.isArray(val);
          break;
        case "other":
          addType = /** @type {OtherTypeCallback} */
          this.currOtherTypeCallback(val, path, parent, parentPropName, arg) || false;
          break;
        case "null":
          addType = val === null;
          break;
        case "symbol":
          addType = typeof val === "symbol";
          break;
        case "BigInt":
          addType = typeof val === "bigint";
          break;
        case "Promise":
          addType = toStringTag(val) === "Promise";
          break;
        case "jsonReference":
          addType = Boolean(val) && typeof val === "object" && Object.hasOwn(
            /** @type {object} */
            val,
            "$ref"
          );
          break;
        default:
          if (this.currCustomTypes && Object.hasOwn(this.currCustomTypes, valueType)) {
            addType = this.currCustomTypes[valueType](val, path, parent, parentPropName, arg) || false;
          } else {
            throw new TypeError("Unknown value type " + valueType);
          }
      }
      if (addType) {
        retObj = {
          path,
          value: val,
          parent,
          parentProperty: parentPropName
        };
        this._handleCallback(retObj, callback, "value");
        return retObj;
      }
    } else if (val && loc[0] === "`" && Object.hasOwn(val, loc.slice(1))) {
      const locProp = loc.slice(1);
      const valObj = (
        /** @type {Record<string, unknown>} */
        val
      );
      addRet(this._trace(x, valObj[locProp], push(path, locProp), val, locProp, callback, hasArrExpr, true));
    } else if (loc[0] === "'" || loc[0] === '"') {
      for (const [, single, double] of loc.matchAll(new RegExp(`'((?:\\\\.|[^'\\\\])*)'|"((?:\\\\.|[^"\\\\])*)"`, "gv"))) {
        const prop = (single ?? double).replaceAll(new RegExp(`\\\\(['"\\\\])`, "gv"), "$1");
        if (!val || !Object.hasOwn(val, prop)) {
          continue;
        }
        const valObj = (
          /** @type {Record<string, unknown>} */
          val
        );
        addRet(this._trace(x, valObj[prop], push(path, prop), val, prop, callback, true));
      }
    } else if (loc.includes(",")) {
      const parts = loc.split(",");
      for (const part of parts) {
        addRet(this._trace(unshift(part, x), val, path, parent, parentPropName, callback, true));
      }
    } else if (!literalPriority && val && Object.hasOwn(val, loc)) {
      const valObj = (
        /** @type {Record<string, unknown>} */
        val
      );
      addRet(this._trace(x, valObj[loc], push(path, loc), val, loc, callback, hasArrExpr, true));
    }
    if (this._hasParentSelector) {
      for (let t = 0; t < ret.length; t++) {
        const rett = ret[t];
        if (!rett || !rett.isParentSelector) {
          continue;
        }
        const exprToUse = (
          /** @type {ExpressionArray} */
          rett.expr
        );
        const pathToUse = (
          /** @type {ExpressionArray} */
          rett.path
        );
        const tmp = this._trace(exprToUse, val, pathToUse, parent, parentPropName, callback, hasArrExpr);
        if (Array.isArray(tmp)) {
          ret[t] = tmp[0];
          const tl = tmp.length;
          for (let tt = 1; tt < tl; tt++) {
            t++;
            ret.splice(t, 0, tmp[tt]);
          }
        } else {
          ret[t] = tmp;
        }
      }
    }
    return ret;
  }
  /**
   * @param {unknown} val
   * @param {(prop: string|number) => void} f
   * @returns {void}
   */
  _walk(val, f) {
    if (Array.isArray(val)) {
      const n = val.length;
      for (let i = 0; i < n; i++) {
        f(i);
      }
    } else if (val && typeof val === "object") {
      Object.keys(val).forEach((m) => {
        f(m);
      });
    }
  }
  /**
   * @param {string} loc
   * @param {ExpressionArray} expr
   * @param {unknown} val
   * @param {ExpressionArray} path
   * @param {ParentValue} parent
   * @param {ParentProperty} parentPropName
   * @param {JSONPathCallback|undefined} callback
   * @returns {ReturnObject[]|undefined}
   */
  _slice(loc, expr, val, path, parent, parentPropName, callback) {
    if (!Array.isArray(val)) {
      return void 0;
    }
    const len = val.length, parts = loc.split(":"), step = parts[2] && Number(parts[2]) || 1;
    let start = parts[0] && Number(parts[0]) || 0, end = parts[1] ? Number(parts[1]) : len;
    start = start < 0 ? Math.max(0, start + len) : Math.min(len, start);
    end = end < 0 ? Math.max(0, end + len) : Math.min(len, end);
    const ret = [];
    for (let i = start; i < end; i += step) {
      const tmp = this._trace(unshift(i, expr), val, path, parent, parentPropName, callback, true);
      const tmpArray = Array.isArray(tmp) ? tmp : [tmp];
      tmpArray.forEach((t) => {
        ret.push(t);
      });
    }
    return ret;
  }
  /**
   * @param {string} code
   * @param {unknown} _v
   * @param {string|number} _vname
   * @param {ExpressionArray} path
   * @param {ParentValue} parent
   * @param {ParentProperty} parentPropName
   * @returns {UnknownResult}
   */
  _eval(code, _v, _vname, path, parent, parentPropName) {
    if (this.currSandbox) {
      this.currSandbox._$_parentProperty = parentPropName;
      this.currSandbox._$_parent = parent;
      this.currSandbox._$_property = _vname;
      this.currSandbox._$_root = this.json;
      this.currSandbox._$_v = _v;
    }
    const containsPath = code.includes("@path");
    if (containsPath) {
      const currSandbox = this.currSandbox ?? {};
      currSandbox._$_path = JSONPath.toPathString(
        /** @type {string[]} */
        path.concat([_vname])
      );
    }
    const scriptCacheKey = this.currEval + "Script:" + code;
    if (!scriptCache.has(scriptCacheKey)) {
      let script = code.replaceAll("@parentProperty", "_$_parentProperty").replaceAll("@parent", "_$_parent").replaceAll("@property", "_$_property").replaceAll("@root", "_$_root").replaceAll(new RegExp(`('(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*"|(?<=(?:^|[\\(,=:\\[!\\|?\\{\\};+\\-*%<>~^]|&)\\s*)\\/(?:\\\\.|\\[(?:\\\\.|[^\\]\\\\])*\\]|[^\\/\\\\\\[])+\\/[dgimsuvy]*)|@(?![\\w$])`, "gv"), (_, literal) => literal ?? "_$_v");
      if (containsPath) {
        script = script.replaceAll("@path", "_$_path");
      }
      const evalType = (
        /** @type {string|boolean|undefined} */
        this.currEval
      );
      if (["safe", true, void 0].includes(evalType)) {
        scriptCache.set(scriptCacheKey, new /**
         * @type {JSONPathClass & {
         *   safeVm: SafeScriptType,
         *   vm: ScriptType
         * }}
         */
        /** @type {unknown} */
        this.safeVm.Script(script));
      } else if (this.currEval === "native") {
        scriptCache.set(scriptCacheKey, new /**
         * @type {JSONPathClass & {
         *   safeVm: SafeScriptType,
         *   vm: ScriptType
         * }}
         */
        /** @type {unknown} */
        this.vm.Script(script));
      } else if (typeof this.currEval === "function" && this.currEval.prototype && Object.hasOwn(this.currEval.prototype, "runInNewContext")) {
        const CurrEval = this.currEval;
        scriptCache.set(scriptCacheKey, new CurrEval(script));
      } else if (typeof this.currEval === "function") {
        const evalFunc = (
          /** @type {EvalCallback} */
          this.currEval
        );
        scriptCache.set(scriptCacheKey, {
          runInNewContext: (context) => evalFunc(script, context)
        });
      } else {
        throw new TypeError(`Unknown "eval" property "${this.currEval}"`);
      }
    }
    try {
      return (
        /** @type {RunInNewContext} */
        scriptCache.get(scriptCacheKey).runInNewContext(this.currSandbox)
      );
    } catch (e) {
      if (this.ignoreEvalErrors) {
        return false;
      }
      const error = (
        /** @type {Error} */
        e
      );
      throw new Error("jsonPath: " + error.message + ": " + code, {
        cause: e
      });
    }
  }
};
/** @type {unknown} */
JSONPathClass.prototype.safeVm = {
  Script: SafeScript
};
JSONPath.prototype = JSONPathClass.prototype;
JSONPath.clearCache = function() {
  pathCache.clear();
  scriptCache.clear();
};
JSONPath.toPathString = function(pathArr) {
  const x = pathArr, n = x.length;
  let p = "$";
  for (let i = 1; i < n; i++) {
    if (!new RegExp("^(~|\\^|@.*?\\(\\))$", "v").test(x[i])) {
      p += new RegExp("^[0-9*]+$", "v").test(x[i]) ? "[" + x[i] + "]" : "['" + String(x[i]).replaceAll(new RegExp("['\\\\]", "gv"), String.raw`\$&`) + "']";
    }
  }
  return p;
};
JSONPath.toPointer = function(pointer) {
  const x = pointer, n = x.length;
  let p = "";
  for (let i = 1; i < n; i++) {
    if (!new RegExp("^(~|\\^|@.*?\\(\\))$", "v").test(x[i])) {
      p += "/" + x[i].toString().replaceAll("~", "~0").replaceAll("/", "~1");
    }
  }
  return p;
};
JSONPath.toPathArray = function(expr) {
  if (pathCache.has(expr)) {
    return (
      /** @type {string[]} */
      pathCache.get(expr).concat()
    );
  }
  const subx = [];
  const normalized = expr.replaceAll(new RegExp("@[\\w$\\-]+\\([^\\)]*\\)", "gv"), ";$&;").replaceAll(new RegExp("[\\['](\\??\\(.*?\\))[\\]'](?!.\\])", "gv"), function($0, $1) {
    return "[#" + // eslint-disable-next-line @stylistic/max-len -- Long
    // eslint-disable-next-line unicorn/no-return-array-push -- Optimization
    (subx.push($1) - 1) + "]";
  }).replaceAll(new RegExp(`\\[\\s*((?:'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*")(?:\\s*,\\s*(?:'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*"))*)\\s*\\]`, "gv"), function($0, $1) {
    if (!new RegExp("[,\\\\]", "v").test($1)) {
      return $0;
    }
    return "[#" + (subx.push($1) - 1) + "]";
  }).replaceAll(new RegExp(`\\[['"]([^'\\]]*)['"]\\]`, "gv"), function($0, prop) {
    return "['" + prop.replaceAll(".", "%@%").replaceAll("~", "%%@@%%") + "']";
  }).replaceAll("~", ";~;").replaceAll(new RegExp(`['"]?\\.['"]?(?![^\\[]*\\])|\\[['"]?`, "gv"), ";").replaceAll("%@%", ".").replaceAll("%%@@%%", "~").replaceAll(new RegExp("(?:;)?(\\^+)(?:;)?", "gv"), function($0, ups) {
    return ";" + ups.split("").join(";") + ";";
  }).replaceAll(new RegExp(";;;|;;", "gv"), ";..;").replaceAll(new RegExp(";$|'?\\]|'$", "gv"), "");
  const exprList = normalized.split(";").map(function(exp) {
    const match = exp.match(new RegExp("#(\\d+)", "v"));
    return !match || !match[1] ? exp : subx[Number(match[1])];
  });
  pathCache.set(expr, exprList);
  return (
    /** @type {string[]} */
    pathCache.get(expr).concat()
  );
};
/** @type {unknown} */
JSONPathClass.prototype.vm = /** @type {ScriptType} */
/** @type {unknown} */
vm;

// src/runner/variaveis.ts
var CACHE_MS = 5 * 60 * 1e3;

// src/runner/workspaces.ts
function ehWorkspace(dir) {
  return ["CLAUDE.md", "devmove-valores.md", "doc/demandas"].every((p) => existsSync(join2(dir, p)));
}
function acharWorkspace(de) {
  let dir = resolve(de);
  for (; ; ) {
    if (ehWorkspace(dir)) return dir;
    const pai = dirname(dir);
    if (pai === dir) return null;
    dir = pai;
  }
}

// src/runner/apps/config.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2 } from "node:fs";
import { isAbsolute, join as join3, normalize } from "node:path";
var NOME_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
var arquivoConfig = (ws) => join3(ws, "tools", ".local", "apps.json");
var raizApps = (ws) => join3(ws, ".devmove", "apps");
var pastas = (ws) => ({
  raiz: raizApps(ws),
  estado: join3(raizApps(ws), "estado"),
  pedidos: join3(raizApps(ws), "pedidos"),
  logs: join3(raizApps(ws), "logs")
});
function garantirPastas(ws) {
  for (const p of Object.values(pastas(ws))) mkdirSync2(p, { recursive: true });
}
var arquivoEstado = (ws, app) => join3(pastas(ws).estado, `${app}.json`);
var arquivoSaida = (ws, app) => join3(pastas(ws).estado, `${app}.saida`);
var arquivoLog = (ws, app, anterior = false) => join3(pastas(ws).logs, `${app}${anterior ? ".anterior" : ""}.log`);
var arquivoBatimento = (ws) => join3(raizApps(ws), "supervisor.json");
var arquivoLogSupervisor = (ws) => join3(raizApps(ws), "supervisor.log");
function texto(v, campo, app) {
  if (typeof v !== "string" || !v.trim()) throw new ErroRunner(`apps.json: ${app}.${campo} precisa ser texto`);
  return v;
}
function pastaInterna(pasta, app) {
  const n = normalize(pasta).replace(/\\/g, "/");
  if (isAbsolute(pasta) || n.startsWith("..")) throw new ErroRunner(`apps.json: ${app}.pasta precisa ficar dentro do workspace`);
  return n;
}
function parsearConfig(conteudo) {
  let bruto;
  try {
    bruto = JSON.parse(conteudo);
  } catch (e) {
    throw new ErroRunner(`apps.json inv\xE1lido: ${e.message}`);
  }
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) throw new ErroRunner('apps.json precisa ser um objeto { "<app>": {...} }');
  return Object.entries(bruto).filter(([nome]) => !nome.startsWith("$")).map(([nome, c]) => {
    if (!NOME_VALIDO.test(nome)) throw new ErroRunner(`apps.json: nome de app inv\xE1lido: ${nome}`);
    if (!c || typeof c !== "object") throw new ErroRunner(`apps.json: ${nome} precisa ser um objeto`);
    const repo = c.repo === void 0 ? nome : texto(c.repo, "repo", nome);
    const env = c.env ?? {};
    if (typeof env !== "object" || Array.isArray(env) || Object.values(env).some((v) => typeof v !== "string"))
      throw new ErroRunner(`apps.json: ${nome}.env precisa ser { "VAR": "valor" }`);
    const antes = c.antes ?? [];
    if (!Array.isArray(antes) || antes.some((a) => typeof a !== "string")) throw new ErroRunner(`apps.json: ${nome}.antes precisa ser lista de comandos`);
    const porta = c.porta ?? null;
    if (porta !== null && (!Number.isInteger(porta) || porta <= 0)) throw new ErroRunner(`apps.json: ${nome}.porta precisa ser n\xFAmero`);
    return {
      nome,
      repo,
      pasta: pastaInterna(c.pasta === void 0 ? `code/${repo}` : texto(c.pasta, "pasta", nome), nome),
      comando: texto(c.comando, "comando", nome),
      env,
      antes,
      porta,
      health: c.health === void 0 || c.health === null ? null : texto(c.health, "health", nome)
    };
  });
}
function lerConfig(ws) {
  const arq = arquivoConfig(ws);
  return existsSync2(arq) ? lerCacheado(arq, parsearConfig) : [];
}
function configDe(ws, app) {
  const c = lerConfig(ws).find((x) => x.nome === app);
  if (!c) throw new ErroRunner(`app n\xE3o configurada em tools/.local/apps.json: ${app}`, 404);
  return c;
}

// src/runner/apps/processo.ts
import { execFileSync, spawn } from "node:child_process";
import { closeSync as closeSync2, existsSync as existsSync4, openSync as openSync2, readFileSync as readFileSync4, readdirSync as readdirSync2, renameSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { connect } from "node:net";
import { join as join5 } from "node:path";

// src/runner/apps/subidas.ts
import { appendFileSync, existsSync as existsSync3, readFileSync as readFileSync3 } from "node:fs";
import { join as join4 } from "node:path";
var arquivo = (ws) => join4(pastas(ws).raiz, "subidas.jsonl");
var gravar = (ws, l) => {
  garantirPastas(ws);
  appendFileSync(arquivo(ws), `${JSON.stringify(l)}
`);
};
function criarSubida(ws, app, autor2, iniciada_em) {
  const id2 = `${app}-${Date.parse(iniciada_em)}`;
  gravar(ws, { id: id2, app, autor: autor2, iniciada_em });
  return id2;
}
function finalizarSubida(ws, id2, app, situacao, codigo) {
  gravar(ws, { id: id2, app, finalizada_em: (/* @__PURE__ */ new Date()).toISOString(), situacao_final: situacao, codigo_saida: codigo });
}

// src/runner/apps/processo.ts
var PARADA = {
  situacao: "parada",
  pid: null,
  iniciada_em: null,
  finalizada_em: null,
  codigo_saida: null,
  erro: null,
  autor: null,
  subida_id: null
};
var ATIVAS = ["subindo", "no_ar", "parando"];
var ativa = (s) => ATIVAS.includes(s);
function lerEstado(ws, app) {
  try {
    return { ...PARADA, ...JSON.parse(readFileSync4(arquivoEstado(ws, app), "utf8")) };
  } catch {
    return PARADA;
  }
}
function gravarJson(arq, dados) {
  const tmp = `${arq}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(dados));
  try {
    renameSync(tmp, arq);
  } catch {
    writeFileSync(arq, JSON.stringify(dados));
    rmSync(tmp, { force: true });
  }
}
function gravarEstado(ws, app, e) {
  gravarJson(arquivoEstado(ws, app), e);
  return e;
}
function vivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}
var WRAPPER = `saida="$PWD/$DEVMOVE_APP_SAIDA"
while IFS= read -r antes <&3; do
  [ -z "$antes" ] && continue
  echo "\\$ $antes"
  (eval "$antes") </dev/null || { c=$?; echo "falhou: $antes (c\xF3digo $c)"; echo $c > "$saida"; exit $c; }
done 3<<< "$DEVMOVE_APP_ANTES"
cd "$DEVMOVE_APP_PASTA" || { echo 1 > "$saida"; exit 1; }
echo "\\$ $DEVMOVE_APP_CMD"
(eval "$DEVMOVE_APP_CMD")
c=$?
echo $c > "$saida"
exit $c`;
function girarLog(ws, app) {
  const atual = arquivoLog(ws, app);
  if (!existsSync4(atual)) return;
  try {
    rmSync(arquivoLog(ws, app, true), { force: true });
    renameSync(atual, arquivoLog(ws, app, true));
  } catch {
    writeFileSync(atual, "");
  }
}
function subir(ws, app, autor2) {
  const c = configDe(ws, app);
  const atual = lerEstado(ws, app);
  if (ativa(atual.situacao) && atual.pid && vivo(atual.pid)) throw new ErroRunner(`${app} j\xE1 est\xE1 ${atual.situacao} (pid ${atual.pid})`, 409);
  if (ativa(atual.situacao)) finalizar(ws, app, atual, "parada", null, null);
  if (!existsSync4(join5(ws, c.pasta))) throw new ErroRunner(`pasta ${c.pasta} n\xE3o existe: clone o reposit\xF3rio (tools/clonar-repos.sh)`);
  garantirPastas(ws);
  girarLog(ws, app);
  rmSync(arquivoSaida(ws, app), { force: true });
  const fd = openSync2(arquivoLog(ws, app), "w");
  const agora = (/* @__PURE__ */ new Date()).toISOString();
  try {
    writeSync(fd, `# ${app} \xB7 ${c.pasta} \xB7 ${agora} \xB7 ${autor2}
`);
    const filho = spawn(process.env.DEVMOVE_BASH || "bash", ["-c", WRAPPER], {
      cwd: ws,
      env: {
        ...process.env,
        ...c.env,
        DEVMOVE_APP_CMD: c.comando,
        DEVMOVE_APP_ANTES: c.antes.join("\n"),
        DEVMOVE_APP_PASTA: c.pasta,
        DEVMOVE_APP_SAIDA: `.devmove/apps/estado/${app}.saida`
      },
      detached: true,
      stdio: ["ignore", fd, fd],
      windowsHide: true
    });
    filho.on("error", () => {
    });
    if (!filho.pid) throw new ErroRunner("bash n\xE3o encontrado no PATH: o supervisor precisa rodar pelo Git Bash no Windows", 500);
    filho.unref();
    const subida_id = criarSubida(ws, app, autor2, agora);
    return gravarEstado(ws, app, { ...PARADA, situacao: "subindo", pid: filho.pid, iniciada_em: agora, autor: autor2, subida_id });
  } finally {
    closeSync2(fd);
  }
}
function finalizar(ws, app, e, situacao, codigo, erro) {
  if (e.subida_id) finalizarSubida(ws, e.subida_id, app, situacao, codigo);
  return gravarEstado(ws, app, { ...e, situacao, pid: null, finalizada_em: (/* @__PURE__ */ new Date()).toISOString(), codigo_saida: codigo, erro });
}
function pidsDoGrupoMsys(pid) {
  try {
    const linhas = execFileSync(process.env.DEVMOVE_BASH || "bash", ["-c", "ps"], { encoding: "utf8", windowsHide: true }).split("\n").slice(1).map((l) => l.trim().split(/\s+/)).map((c) => /^\d+$/.test(c[0] ?? "") ? c : c.slice(1)).filter((c) => c.length >= 4).map(([, , pgid, winpid]) => ({ pgid, winpid: Number(winpid) }));
    const raiz = linhas.find((l) => l.winpid === pid);
    return raiz ? linhas.filter((l) => l.pgid === raiz.pgid && l.winpid !== pid).map((l) => l.winpid) : [];
  } catch {
    return [];
  }
}
function matarArvore(pid, forcar) {
  if (process.platform === "win32") {
    for (const alvo of [...pidsDoGrupoMsys(pid), pid]) {
      try {
        execFileSync("taskkill", ["/T", "/F", "/PID", String(alvo)], { stdio: "ignore", windowsHide: true });
      } catch {
      }
    }
    return;
  }
  const sinal = forcar ? "SIGKILL" : "SIGTERM";
  try {
    process.kill(-pid, sinal);
  } catch {
    try {
      process.kill(pid, sinal);
    } catch {
    }
  }
}
var esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function parar(ws, app) {
  const e = lerEstado(ws, app);
  if (!e.pid || !vivo(e.pid)) return ativa(e.situacao) ? finalizar(ws, app, e, "parada", null, null) : e;
  gravarEstado(ws, app, { ...e, situacao: "parando" });
  matarArvore(e.pid, false);
  for (let i = 0; i < 20 && vivo(e.pid); i++) await esperar(500);
  if (vivo(e.pid)) matarArvore(e.pid, true);
  return finalizar(ws, app, e, "parada", null, null);
}
function portaAberta(porta) {
  return new Promise((ok) => {
    const s = connect({ port: porta, host: "localhost", timeout: 1500 });
    const fim = (r) => {
      s.destroy();
      ok(r);
    };
    s.once("connect", () => fim(true));
    s.once("timeout", () => fim(false));
    s.once("error", () => fim(false));
  });
}
async function respondendo(c) {
  if (c.health) {
    try {
      const r = await fetch(c.health, { signal: AbortSignal.timeout(2e3), redirect: "manual" });
      await r.body?.cancel();
      return r.status < 400;
    } catch {
      return false;
    }
  }
  if (c.porta) return portaAberta(c.porta);
  return true;
}
function codigoSaida(ws, app) {
  try {
    const n = Number.parseInt(readFileSync4(arquivoSaida(ws, app), "utf8").trim(), 10);
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}
async function atualizar(ws, c) {
  const e = lerEstado(ws, c.nome);
  if (!e.pid || e.situacao !== "subindo" && e.situacao !== "no_ar") return e;
  if (!vivo(e.pid)) {
    const codigo = codigoSaida(ws, c.nome);
    if (codigo === 0) return finalizar(ws, c.nome, e, "parada", 0, null);
    return finalizar(ws, c.nome, e, "falhou", codigo, codigo === null ? "processo terminou sem c\xF3digo de sa\xEDda" : `saiu com c\xF3digo ${codigo}`);
  }
  if (e.situacao === "subindo" && await respondendo(c)) return gravarEstado(ws, c.nome, { ...e, situacao: "no_ar" });
  return e;
}
function registrarFalha(ws, app, erro) {
  const e = lerEstado(ws, app);
  if (!ativa(e.situacao)) gravarEstado(ws, app, { ...e, situacao: "falhou", pid: null, erro, finalizada_em: (/* @__PURE__ */ new Date()).toISOString() });
}
var ACOES = ["subir", "parar", "reiniciar"];
function retirarPedidos(ws) {
  const dir = pastas(ws).pedidos;
  if (!existsSync4(dir)) return [];
  const r = [];
  for (const f of readdirSync2(dir).filter((n) => n.endsWith(".json")).sort()) {
    const arq = join5(dir, f);
    try {
      const p = JSON.parse(readFileSync4(arq, "utf8"));
      if (NOME_VALIDO.test(p.app) && ACOES.includes(p.acao)) r.push(p);
    } catch {
    }
    rmSync(arq, { force: true });
  }
  return r;
}
var VALIDADE_BATIMENTO = 6e3;
function lerBatimento(ws) {
  try {
    return JSON.parse(readFileSync4(arquivoBatimento(ws), "utf8"));
  } catch {
    return null;
  }
}
function supervisor(ws) {
  const b = lerBatimento(ws);
  return { ligado: !!b && Date.now() - Date.parse(b.visto_em) < VALIDADE_BATIMENTO, visto_em: b?.visto_em ?? null };
}
function bater(ws) {
  gravarJson(arquivoBatimento(ws), { pid: process.pid, visto_em: (/* @__PURE__ */ new Date()).toISOString() });
}

// src/runner/apps/repos.ts
import { execFileSync as execFileSync2 } from "node:child_process";
import { appendFileSync as appendFileSync2, existsSync as existsSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join6 } from "node:path";
var arquivoRepos = (ws) => join6(ws, "tools", "repos.txt");
function parsearRepos(texto2) {
  return texto2.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("{{")).map((l) => l.split(/\s+/)).filter(([nome, url]) => nome && url).map(([nome, url]) => ({ nome, url, pasta: `code/${nome}` }));
}
var espelhados = /* @__PURE__ */ new Map();
function sincronizarRepos(ws) {
  const arq = arquivoRepos(ws);
  const lista = existsSync5(arq) ? lerCacheado(arq, parsearRepos) : [];
  if (espelhados.get(ws) === lista) return;
  repositorio(ws).sincronizarRepos(lista);
  espelhados.set(ws, lista);
}
function listarRepos(ws, config, espelhar) {
  let repos;
  if (espelhar) {
    sincronizarRepos(ws);
    repos = repositorio(ws).repos();
  } else repos = existsSync5(arquivoRepos(ws)) ? parsearRepos(readFileSync5(arquivoRepos(ws), "utf8")) : [];
  return repos.map((r) => ({ ...r, clonado: existsSync5(join6(ws, r.pasta)), apps: config.filter((c) => c.repo === r.nome).map((c) => c.nome) }));
}
function git(ws, args, herdar = false) {
  return execFileSync2("git", ["-C", ws, ...args], { encoding: "utf8", stdio: herdar ? "inherit" : "pipe" }) ?? "";
}
function adicionarRepo(ws, nome, url, log) {
  if (!NOME_VALIDO.test(nome)) throw new ErroRunner(`nome inv\xE1lido: ${nome} (letras, n\xFAmeros, ponto, h\xEDfen e sublinhado)`);
  if (!url || /\s/.test(url) || url.startsWith("-")) throw new ErroRunner(`url inv\xE1lida: ${url}`);
  const arq = arquivoRepos(ws);
  const atuais = existsSync5(arq) ? parsearRepos(readFileSync5(arq, "utf8")) : [];
  if (atuais.some((r) => r.nome === nome)) throw new ErroRunner(`${nome} j\xE1 est\xE1 em tools/repos.txt`, 409);
  const destino = join6(ws, "code", nome);
  if (existsSync5(join6(destino, ".git"))) log(`= ${nome}: j\xE1 clonado em code/${nome}`);
  else {
    log(`+ ${nome}: clone de ${url}`);
    execFileSync2("git", ["clone", "-q", "--", url, destino], { stdio: "inherit" });
  }
  if (!existsSync5(arq)) writeFileSync2(arq, "# Um reposit\xF3rio por linha: <pasta em code/> <url git>\n");
  const texto2 = readFileSync5(arq, "utf8");
  appendFileSync2(arq, `${texto2 && !texto2.endsWith("\n") ? "\n" : ""}${nome} ${url}
`);
  let versionado = false;
  try {
    versionado = git(ws, ["rev-parse", "--is-inside-work-tree"]).trim() === "true";
  } catch {
  }
  if (versionado) {
    git(ws, ["add", "--", "tools/repos.txt"]);
    git(ws, ["commit", "-q", "-m", `chore(repos): adiciona ${nome}`, "--", "tools/repos.txt"], true);
    log(`commit: chore(repos): adiciona ${nome}`);
  } else log("workspace sem git: tools/repos.txt alterado sem commit");
}

// src/runner/apps/painel.ts
var appDe = (ws, c) => ({
  nome: c.nome,
  repo: c.repo,
  pasta: c.pasta,
  comando: c.comando,
  porta: c.porta,
  health: c.health,
  ...lerEstado(ws, c.nome)
});
function painelApps(ws, espelhar) {
  let config = [];
  let erro_config = null;
  try {
    config = lerConfig(ws);
  } catch (e) {
    erro_config = e.message;
  }
  return {
    supervisor: supervisor(ws),
    apps: config.map((c) => appDe(ws, c)),
    repos_sem_app: listarRepos(ws, config, espelhar).filter((r) => !r.apps.length),
    erro_config
  };
}

// src/runner/apps/inicializacao.ts
import { execFileSync as execFileSync3 } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync as existsSync6, mkdirSync as mkdirSync3, readFileSync as readFileSync6, rmSync as rmSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { homedir } from "node:os";
import { basename as basename2, join as join7 } from "node:path";
var id = (ws) => `devmove-apps-${basename2(ws).replace(/[^A-Za-z0-9_-]/g, "-")}-${createHash("sha1").update(ws).digest("hex").slice(0, 6)}`;
var silencioso = (cmd, args) => {
  try {
    execFileSync3(cmd, args, { stdio: "ignore" });
  } catch {
  }
};
var caminhoMsys = (p) => p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
function windows(ws) {
  const bash = process.env.DEVMOVE_BASH;
  if (!bash || !process.env.APPDATA) throw new ErroRunner("rode pelo tools/apps.sh no Git Bash: falta o caminho do bash");
  const arquivo2 = join7(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", `${id(ws)}.cmd`);
  const conteudo = [
    "@echo off",
    "chcp 65001 >nul",
    `rem Gerado por tools/apps.sh inicializacao. Liga no logon o supervisor das aplica\xE7\xF5es de ${ws}.`,
    `start "" /min "${bash}" -lc "cd '${caminhoMsys(ws)}' && tools/apps.sh ligar"`,
    ""
  ].join("\r\n");
  return { arquivo: arquivo2, conteudo, ativar: () => {
  }, desativar: () => {
  } };
}
function linux(ws) {
  const nome = `${id(ws)}.service`;
  const conteudo = `# Gerado por tools/apps.sh inicializacao.
[Unit]
Description=DevMove Flow: supervisor das aplica\xE7\xF5es de ${ws}

[Service]
WorkingDirectory=${ws}
Environment=PATH=${process.env.PATH ?? ""}
ExecStart=/usr/bin/env bash ${ws}/tools/apps.sh supervisor
Restart=always
RestartSec=10
StandardOutput=append:${arquivoLogSupervisor(ws)}
StandardError=append:${arquivoLogSupervisor(ws)}

[Install]
WantedBy=default.target
`;
  return {
    arquivo: join7(homedir(), ".config", "systemd", "user", nome),
    conteudo,
    ativar: () => {
      execFileSync3("systemctl", ["--user", "daemon-reload"], { stdio: "inherit" });
      execFileSync3("systemctl", ["--user", "enable", "--now", nome], { stdio: "inherit" });
    },
    desativar: () => {
      silencioso("systemctl", ["--user", "disable", "--now", nome]);
      silencioso("systemctl", ["--user", "daemon-reload"]);
    }
  };
}
function macos(ws) {
  const rotulo = `br.devmove.${id(ws)}`;
  const arquivo2 = join7(homedir(), "Library", "LaunchAgents", `${rotulo}.plist`);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const conteudo = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!-- Gerado por tools/apps.sh inicializacao. -->
<plist version="1.0">
<dict>
  <key>Label</key><string>${rotulo}</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>${esc(ws)}/tools/apps.sh</string><string>supervisor</string></array>
  <key>WorkingDirectory</key><string>${esc(ws)}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${esc(process.env.PATH ?? "")}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${esc(arquivoLogSupervisor(ws))}</string>
  <key>StandardErrorPath</key><string>${esc(arquivoLogSupervisor(ws))}</string>
</dict>
</plist>
`;
  return {
    arquivo: arquivo2,
    conteudo,
    ativar: () => execFileSync3("launchctl", ["load", "-w", arquivo2], { stdio: "inherit" }),
    desativar: () => silencioso("launchctl", ["unload", "-w", arquivo2])
  };
}
function registro(ws) {
  if (process.platform === "win32") return windows(ws);
  if (process.platform === "darwin") return macos(ws);
  return linux(ws);
}
function instalarInicializacao(ws, desligar2, ligar2) {
  const r = registro(ws);
  const igual = existsSync6(r.arquivo) && readFileSync6(r.arquivo, "utf8") === r.conteudo;
  if (igual && supervisor(ws).ligado) return `inicializa\xE7\xE3o em dia: ${r.arquivo}`;
  mkdirSync3(join7(r.arquivo, ".."), { recursive: true });
  writeFileSync3(r.arquivo, r.conteudo);
  if (process.platform === "win32") ligar2();
  else {
    desligar2();
    r.desativar();
    r.ativar();
  }
  return `inicializa\xE7\xE3o registrada: ${r.arquivo}`;
}
function removerInicializacao(ws) {
  const r = registro(ws);
  if (!existsSync6(r.arquivo)) return "inicializa\xE7\xE3o n\xE3o estava registrada";
  r.desativar();
  rmSync2(r.arquivo, { force: true });
  return `inicializa\xE7\xE3o removida: ${r.arquivo} (o supervisor atual segue at\xE9 desligar ou reiniciar a m\xE1quina)`;
}
function statusInicializacao(ws) {
  const r = registro(ws);
  return existsSync6(r.arquivo) ? `inicializa\xE7\xE3o registrada: ${r.arquivo}` : "inicializa\xE7\xE3o n\xE3o registrada (tools/apps.sh inicializacao instalar)";
}

// src/runner/apps/supervisor.ts
import { rmSync as rmSync3 } from "node:fs";
async function executar(ws, p) {
  if (p.acao !== "subir") await parar(ws, p.app);
  if (p.acao !== "parar") subir(ws, p.app, p.autor);
}
async function supervisionar(ws, log) {
  const outro = lerBatimento(ws);
  if (outro && outro.pid !== process.pid && supervisor(ws).ligado && vivo(outro.pid)) throw new ErroRunner(`supervisor j\xE1 ligado (pid ${outro.pid})`);
  garantirPastas(ws);
  const sair2 = () => {
    rmSync3(arquivoBatimento(ws), { force: true });
    process.exit(0);
  };
  process.on("SIGINT", sair2);
  process.on("SIGTERM", sair2);
  const filas = /* @__PURE__ */ new Map();
  const ocupadas = /* @__PURE__ */ new Set();
  const enfileirar = (app, tarefa) => {
    ocupadas.add(app);
    const fila = (filas.get(app) ?? Promise.resolve()).then(tarefa).finally(() => {
      if (filas.get(app) === fila) {
        filas.delete(app);
        ocupadas.delete(app);
      }
    });
    filas.set(app, fila);
  };
  log(`supervisor ligado em ${ws} (pid ${process.pid})`);
  let tique = 0;
  let erroConfig = "";
  for (; ; ) {
    if (tique++ % 2 === 0) bater(ws);
    for (const p of retirarPedidos(ws)) {
      log(`${p.acao} ${p.app} por ${p.autor}`);
      enfileirar(
        p.app,
        () => executar(ws, p).catch((e) => {
          log(`${p.acao} ${p.app} falhou: ${e.message}`);
          registrarFalha(ws, p.app, e.message);
        })
      );
    }
    let config = [];
    try {
      config = lerConfig(ws);
      erroConfig = "";
    } catch (e) {
      if (e.message !== erroConfig) log(erroConfig = e.message);
    }
    for (const c of config) {
      if (ocupadas.has(c.nome)) continue;
      enfileirar(c.nome, async () => {
        const antes = lerEstado(ws, c.nome).situacao;
        const depois = (await atualizar(ws, c)).situacao;
        if (antes !== depois) log(`${c.nome}: ${antes} \u2192 ${depois}`);
      });
    }
    await new Promise((ok) => setTimeout(ok, 1e3));
  }
}

// src/runner/apps/cli.ts
var USO = `Uso: tools/apps.sh <comando> [args]
  listar
  up <app> [--sem-esperar] [--esperar <s>]   sobe e espera ficar no ar (padr\xE3o 300s)
  down <app>
  restart <app> [--sem-esperar]
  logs <app> [-f] [-n <linhas>] [--anterior]
  supervisor                                atende a UI em primeiro plano
  ligar | desligar                          supervisor em segundo plano
  inicializacao <instalar|remover|status>   supervisor ligado junto com a m\xE1quina
  repo adicionar <pasta> <url>               clona em code/, registra no repos.txt (commit) e no banco
  repo listar
Apps em tools/.local/apps.json (gerado pelo /apps).`;
function sair(msg, codigo = 2) {
  console.error(msg);
  process.exit(codigo);
}
var autor = () => process.env.DEVMOVE_USUARIO || process.env.USER || process.env.USERNAME || "pessoa";
var esperar2 = (ms) => new Promise((ok) => setTimeout(ok, ms));
function duracao(desde) {
  if (!desde) return "";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(desde)) / 1e3));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}`;
}
function linhaApp(a) {
  const partes = [a.nome.padEnd(16), a.situacao.padEnd(8)];
  if (a.pid) partes.push(`pid ${a.pid}`);
  if (a.porta) partes.push(`porta ${a.porta}`);
  if (a.situacao === "subindo" || a.situacao === "no_ar") partes.push(`h\xE1 ${duracao(a.iniciada_em)}`);
  if (a.erro) partes.push(a.erro);
  if (a.repo !== a.nome) partes.push(`repo ${a.repo}`);
  return partes.join(" \xB7 ");
}
function cauda(arq, linhas) {
  if (!existsSync7(arq)) return [];
  return readFileSync7(arq, "utf8").trimEnd().split("\n").slice(-linhas);
}
async function acompanhar(arq) {
  let ate = existsSync7(arq) ? statSync3(arq).size : 0;
  for (; ; ) {
    if (existsSync7(arq)) {
      const t = lerTrecho(arq, ate);
      if (t.ate < 0) ate = 0;
      else {
        process.stdout.write(t.texto);
        ate = t.ate;
      }
    }
    await esperar2(500);
  }
}
async function upEsperando(ws, app, limite) {
  const c = configDe(ws, app);
  subir(ws, app, autor());
  console.log(`${app} subindo \xB7 log em ${relative(ws, arquivoLog(ws, app))}`);
  if (!limite) return;
  const fim = Date.now() + limite * 1e3;
  let e = lerEstado(ws, app);
  while (e.situacao === "subindo" && Date.now() < fim) {
    await esperar2(1e3);
    e = await atualizar(ws, c);
  }
  if (e.situacao === "no_ar") return console.log(`${app} no ar \xB7 pid ${e.pid}${c.porta ? ` \xB7 porta ${c.porta}` : ""} \xB7 ${duracao(e.iniciada_em)}`);
  if (e.situacao === "subindo") sair(`${app} ainda subindo ap\xF3s ${limite}s (segue rodando; tools/apps.sh logs ${app})`, 1);
  console.error(cauda(arquivoLog(ws, app), 30).join("\n"));
  sair(`${app} ${e.situacao}${e.erro ? `: ${e.erro}` : ""}`, 1);
}
function ligar(ws) {
  const s = supervisor(ws);
  const b = lerBatimento(ws);
  if (s.ligado && b && vivo(b.pid)) return console.log(`supervisor j\xE1 ligado (pid ${b.pid})`);
  garantirPastas(ws);
  const fd = openSync3(arquivoLogSupervisor(ws), "a");
  const filho = spawn2(process.execPath, [...process.execArgv, process.argv[1], "supervisor"], {
    cwd: ws,
    detached: true,
    stdio: ["ignore", fd, fd],
    windowsHide: true
  });
  closeSync3(fd);
  filho.unref();
  console.log(`supervisor ligado (pid ${filho.pid}) \xB7 log em ${relative(ws, arquivoLogSupervisor(ws))}`);
}
function desligar(ws) {
  const b = lerBatimento(ws);
  if (b && vivo(b.pid)) {
    try {
      process.kill(b.pid);
    } catch {
    }
  }
  rmSync4(arquivoBatimento(ws), { force: true });
  console.log(b ? `supervisor desligado (pid ${b.pid}); as apps seguem rodando` : "supervisor n\xE3o estava ligado");
}
async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "-h" || args[0] === "--help") sair(USO, args.length ? 0 : 2);
  const ws = acharWorkspace(process.cwd()) ?? sair("workspace n\xE3o encontrado (pasta com CLAUDE.md e doc/demandas/)");
  const flag = (nome) => args.includes(nome);
  const valor = (nome) => {
    const i = args.indexOf(nome);
    return i >= 0 ? args[i + 1] : void 0;
  };
  const [comando, alvo] = args;
  switch (comando) {
    case "listar": {
      const atual = painelApps(ws, false);
      if (atual.erro_config) sair(atual.erro_config);
      for (const c of lerConfig(ws)) Object.assign(atual.apps.find((a) => a.nome === c.nome), await atualizar(ws, c));
      if (!atual.apps.length) console.log(`nenhuma app em ${relative(ws, arquivoConfig(ws))}: rode /apps no Claude Code`);
      for (const a of atual.apps) console.log(linhaApp(a));
      for (const r of atual.repos_sem_app) console.log(`${r.nome.padEnd(16)} \xB7 sem roteiro de subida${r.clonado ? "" : " \xB7 n\xE3o clonado"}`);
      console.log(`supervisor ${atual.supervisor.ligado ? "ligado" : "desligado (tools/apps.sh ligar)"}`);
      return;
    }
    case "up":
    case "restart": {
      if (!alvo) sair(USO);
      if (comando === "restart") await parar(ws, alvo);
      const limite = flag("--sem-esperar") ? 0 : Number(valor("--esperar") ?? 300);
      return upEsperando(ws, alvo, limite);
    }
    case "down": {
      if (!alvo) sair(USO);
      configDe(ws, alvo);
      const e = await parar(ws, alvo);
      return console.log(`${alvo} ${e.situacao}`);
    }
    case "logs": {
      if (!alvo) sair(USO);
      configDe(ws, alvo);
      const arq = arquivoLog(ws, alvo, flag("--anterior"));
      const linhas = cauda(arq, Number(valor("-n") ?? 200));
      if (linhas.length) console.log(linhas.join("\n"));
      else if (!flag("-f")) console.log(`sem log de ${alvo}`);
      if (flag("-f")) await acompanhar(arq);
      return;
    }
    case "supervisor":
      await supervisionar(ws, (msg) => console.log(`${(/* @__PURE__ */ new Date()).toISOString()} ${msg}`));
      return;
    case "ligar":
      return ligar(ws);
    case "desligar":
      return desligar(ws);
    case "inicializacao": {
      if (alvo === "instalar") return console.log(instalarInicializacao(ws, () => desligar(ws), () => ligar(ws)));
      if (alvo === "remover") return console.log(removerInicializacao(ws));
      if (alvo === "status") return console.log(statusInicializacao(ws));
      sair(USO);
    }
    case "repo": {
      if (alvo === "listar") {
        const config = (() => {
          try {
            return lerConfig(ws);
          } catch {
            return [];
          }
        })();
        const repos = listarRepos(ws, config, false);
        if (!repos.length) console.log("nenhum reposit\xF3rio em tools/repos.txt");
        for (const r of repos)
          console.log(`${r.nome.padEnd(16)} \xB7 ${r.clonado ? "clonado" : "n\xE3o clonado"} \xB7 ${r.apps.length ? `apps: ${r.apps.join(", ")}` : "sem roteiro de subida"} \xB7 ${r.url}`);
        return;
      }
      if (alvo === "adicionar") {
        const [, , nome, url] = args;
        if (!nome || !url) sair(USO);
        adicionarRepo(ws, nome, url, console.log);
        return console.log(`pronto. A UI registra no banco ao abrir Aplica\xE7\xF5es; para subir: /apps ${nome} no Claude Code`);
      }
      sair(USO);
    }
  }
  sair(USO);
}
main().catch((e) => sair(`erro: ${e.message}`, 1));
