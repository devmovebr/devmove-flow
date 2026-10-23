// src/runner/cli.ts
import { relative } from "node:path";

// src/runner/banco.ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

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
  }
];

// src/runner/banco.ts
var abertos = /* @__PURE__ */ new Map();
function abrirBanco(ws) {
  const existente = abertos.get(ws);
  if (existente) return existente;
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
  abertos.set(ws, db);
  return db;
}
function paraExecucao(l) {
  return {
    id: l.id,
    rodada_id: l.rodada_id,
    cenario: l.cenario,
    titulo: l.titulo,
    ordem: l.ordem,
    cenario_md: l.cenario_md,
    request: JSON.parse(l.request),
    resposta: l.resposta ? JSON.parse(l.resposta) : null,
    erro: l.erro,
    assercoes: JSON.parse(l.assercoes),
    veredito: l.veredito,
    veredito_auto: l.veredito_auto,
    nota: l.nota,
    executada_em: l.executada_em
  };
}
function semMd(e) {
  const { cenario_md: _, ...resto } = e;
  return resto;
}
var Repositorio = class {
  db;
  constructor(db) {
    this.db = db;
  }
  placar(rodadaId, total) {
    const linhas = this.db.prepare("select veredito, count(*) as n from execucoes where rodada_id = ? group by veredito").all(rodadaId);
    return placarDe(linhas, total);
  }
  // Ambientes ordenados pela execução mais recente.
  ambientesComExecucao(dossie) {
    return this.db.prepare(
      `select r.ambiente from execucoes e join rodadas r on r.id = e.rodada_id
           where r.dossie = ? group by r.ambiente order by max(e.executada_em) desc`
    ).all(dossie).map((l) => l.ambiente);
  }
  estadoAtual(dossie, ambiente, cenarios) {
    const linhas = this.db.prepare(
      `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
         where r.dossie = ? and r.ambiente = ? order by e.executada_em desc, e.id desc`
    ).all(dossie, ambiente);
    const ultimas = /* @__PURE__ */ new Map();
    for (const l of linhas) if (cenarios.includes(l.cenario) && !ultimas.has(l.cenario)) ultimas.set(l.cenario, l);
    if (!ultimas.size) return null;
    const rodadas = /* @__PURE__ */ new Map();
    const execucoes = [...ultimas.values()].map((l) => {
      if (!rodadas.has(l.rodada_id)) rodadas.set(l.rodada_id, this.rodada(l.rodada_id, cenarios.length));
      return { ...semMd(paraExecucao(l)), rodada: rodadas.get(l.rodada_id) };
    }).sort((a, b) => a.ordem - b.ordem);
    const contagem = /* @__PURE__ */ new Map();
    for (const e of execucoes) contagem.set(e.veredito, (contagem.get(e.veredito) ?? 0) + 1);
    return {
      ambiente,
      atualizado_em: execucoes.reduce((m, e) => e.executada_em > m ? e.executada_em : m, ""),
      placar: placarDe([...contagem].map(([veredito, n]) => ({ veredito, n })), cenarios.length),
      execucoes
    };
  }
  estados(dossie, cenarios) {
    return this.ambientesComExecucao(dossie).map((a) => this.estadoAtual(dossie, a, cenarios)).filter((e) => e !== null);
  }
  comPlacar(l, total) {
    return l ? { ...l, placar: this.placar(l.id, total) } : null;
  }
  rodada(id, total) {
    return this.comPlacar(this.db.prepare("select * from rodadas where id = ?").get(id), total);
  }
  rodadas(dossie, total, ambiente) {
    const linhas = ambiente ? this.db.prepare("select * from rodadas where dossie = ? and ambiente = ? order by id desc").all(dossie, ambiente) : this.db.prepare("select * from rodadas where dossie = ? order by id desc").all(dossie);
    return linhas.map((l) => this.comPlacar(l, total));
  }
  ultimaRodada(dossie, total) {
    return this.comPlacar(
      this.db.prepare("select * from rodadas where dossie = ? order by id desc limit 1").get(dossie),
      total
    );
  }
  emExecucao(dossie) {
    return this.db.prepare("select * from rodadas where dossie = ? and status = 'executando' order by id desc limit 1").get(dossie);
  }
  ultimaAtividade(rodadaId) {
    const r = this.db.prepare("select max(executada_em) as m from execucoes where rodada_id = ?").get(rodadaId);
    return r.m ?? "";
  }
  criarRodada(r) {
    const res = this.db.prepare("insert into rodadas (dossie, ambiente, origem, autor, status, iniciada_em) values (?, ?, ?, ?, 'executando', ?)").run(r.dossie, r.ambiente, r.origem, r.autor, r.iniciada_em);
    return Number(res.lastInsertRowid);
  }
  finalizarRodada(id, status) {
    this.db.prepare("update rodadas set status = ?, finalizada_em = ? where id = ?").run(status, (/* @__PURE__ */ new Date()).toISOString(), id);
  }
  inserirExecucao(e) {
    const res = this.db.prepare(
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
  execucao(id) {
    const l = this.db.prepare("select * from execucoes where id = ?").get(id);
    return l ? paraExecucao(l) : null;
  }
  execucoesDaRodada(rodadaId) {
    return this.db.prepare("select * from execucoes where rodada_id = ? order by ordem, id").all(rodadaId).map(
      paraExecucao
    );
  }
  execucoesDoDossie(dossie, ambiente) {
    const sql = `select e.*, r.ambiente from execucoes e join rodadas r on r.id = e.rodada_id
      where r.dossie = ? ${ambiente ? "and r.ambiente = ?" : ""} order by e.executada_em desc, e.id desc`;
    const args = ambiente ? [dossie, ambiente] : [dossie];
    return this.db.prepare(sql).all(...args).map((l) => ({
      ...paraExecucao(l),
      ambiente: l.ambiente
    }));
  }
  historico(dossie, cenario) {
    return this.db.prepare(
      `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
           where r.dossie = ? and e.cenario = ? order by e.executada_em desc, e.id desc`
    ).all(dossie, cenario).map(paraExecucao);
  }
  ultimaExecucao(dossie, ambiente, cenario) {
    const l = this.db.prepare(
      `select e.* from execucoes e join rodadas r on r.id = e.rodada_id
         where r.dossie = ? and r.ambiente = ? and e.cenario = ? order by e.executada_em desc, e.id desc limit 1`
    ).get(dossie, ambiente, cenario);
    return l ? paraExecucao(l) : null;
  }
  mudarVeredito(id, veredito, nota) {
    this.db.prepare("update execucoes set veredito = ?, nota = ? where id = ?").run(veredito, nota, id);
  }
};
function repositorio(ws) {
  return new Repositorio(abrirBanco(ws));
}
function placarDe(linhas, total) {
  const p = { passou: 0, falhou: 0, bloqueado: 0, pendente: 0, nao_executado: 0, total };
  let feitos = 0;
  for (const l of linhas) {
    feitos += l.n;
    if (l.veredito === "PASSOU") p.passou = l.n;
    else if (l.veredito === "FALHOU") p.falhou = l.n;
    else if (l.veredito === "BLOQUEADO") p.bloqueado = l.n;
    else p.pendente = l.n;
  }
  p.nao_executado = Math.max(0, total - feitos);
  return p;
}

// src/runner/evidencia.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync } from "node:fs";
import { join as join4 } from "node:path";

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
    const id = (
      /** @type {jsep.Identifier} */
      ast.left.name
    );
    const value = SafeEval.evalAst(ast.right, subs);
    subs[id] = value;
    return subs[id];
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

// src/runner/assercoes.ts
function parsearAssercao(texto) {
  const st = /^status\s+(\d{3})$/i.exec(texto);
  if (st) return { tipo: "status", esperado: Number(st[1]) };
  if (!texto.startsWith("`")) return { tipo: "manual" };
  const pres = /^`([^`]+)`\s+(existe|ausente)$/.exec(texto);
  if (pres) return { tipo: "presenca", caminho: pres[1], existe: pres[2] === "existe" };
  const cmp = /^`([^`]+)`\s+(==|!=|>=|<=|>|<|contém)\s+(.+)$/.exec(texto);
  if (!cmp) {
    if (/^`\$/.test(texto)) return { tipo: "erro", erro: "esperado `<jsonpath>` <op> <valor JSON>" };
    return { tipo: "manual" };
  }
  try {
    return { tipo: "comparacao", caminho: cmp[1], op: cmp[2], valor: JSON.parse(cmp[3]) };
  } catch {
    return { tipo: "erro", erro: `valor n\xE3o \xE9 JSON: ${cmp[3]}` };
  }
}
function consultar(json, caminho) {
  if (json === void 0 || json === null || typeof json !== "object") return void 0;
  let r;
  try {
    r = JSONPath({ path: caminho, json, wrap: true });
  } catch {
    return void 0;
  }
  if (!r.length) return void 0;
  return r.length === 1 ? r[0] : r;
}
function igual(a, b) {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
function comparar(obtido, op, valor) {
  switch (op) {
    case "==":
      return igual(obtido, valor);
    case "!=":
      return !igual(obtido, valor);
    case "cont\xE9m":
      if (typeof obtido === "string") return typeof valor === "string" && obtido.includes(valor);
      if (Array.isArray(obtido)) return obtido.some((x) => igual(x, valor));
      return false;
    default: {
      if (typeof obtido !== "number" || typeof valor !== "number") return false;
      if (op === ">") return obtido > valor;
      if (op === ">=") return obtido >= valor;
      if (op === "<") return obtido < valor;
      return obtido <= valor;
    }
  }
}
function avaliar(textos, resposta) {
  let json;
  if (resposta) {
    try {
      json = JSON.parse(resposta.body);
    } catch {
      json = void 0;
    }
  }
  return textos.map((texto) => {
    const a = parsearAssercao(texto);
    if (a.tipo === "manual") return { texto, tipo: "manual", ok: null };
    if (a.tipo === "erro") return { texto, tipo: "auto", ok: false, obtido: a.erro };
    if (!resposta) return { texto, tipo: "auto", ok: null };
    if (a.tipo === "status") return { texto, tipo: "auto", ok: resposta.status === a.esperado, obtido: resposta.status };
    const obtido = consultar(json, a.caminho);
    const ok = a.tipo === "presenca" ? obtido !== void 0 === a.existe : comparar(obtido, a.op, a.valor);
    return { texto, tipo: "auto", ok, obtido };
  });
}
function vereditoAuto(assercoes, erro) {
  if (erro) return "FALHOU";
  if (assercoes.some((a) => a.tipo === "auto" && a.ok === false)) return "FALHOU";
  if (assercoes.some((a) => a.tipo === "manual")) return "PENDENTE";
  return "PASSOU";
}

// src/runner/variaveis.ts
import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join as join2 } from "node:path";
var NOME_VAR = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
var CACHE_MS = 5 * 60 * 1e3;
var cacheCmd = /* @__PURE__ */ new Map();
function lerEnv(texto) {
  const r = {};
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    if (!linha || linha.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(linha);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"') || v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    r[m[1]] = v;
  }
  return r;
}
function lerArquivoEnv(caminho) {
  return existsSync(caminho) ? lerEnv(readFileSync(caminho, "utf8")) : {};
}
function listarAmbientes(ws) {
  const dir = join2(ws, "tools", "ambientes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".env")).map((f) => f.slice(0, -4)).sort();
}
function arquivoLocal(ws, amb) {
  return join2(ws, "tools", ".local", "ambientes", `${amb}.env`);
}
function rodarComando(ws, cmd) {
  const chave = `${ws}\0${cmd}`;
  const c = cacheCmd.get(chave);
  if (c && c.expira > Date.now()) return Promise.resolve(c.valor);
  return new Promise((resolve2, reject) => {
    execFile("bash", ["-c", cmd], { cwd: ws, timeout: 3e4 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`comando "${cmd}" falhou: ${(stderr || err.message).trim()}`));
      const valor = stdout.trim();
      cacheCmd.set(chave, { valor, expira: Date.now() + CACHE_MS });
      resolve2(valor);
    });
  });
}
async function resolverVariaveis(ws, amb, camadas = []) {
  const arqAmb = join2(ws, "tools", "ambientes", `${amb}.env`);
  if (!existsSync(arqAmb)) throw new Error(`ambiente desconhecido: ${amb}`);
  const todas = [
    { fonte: "ambiente", valores: lerArquivoEnv(arqAmb) },
    { fonte: "local", valores: lerArquivoEnv(arquivoLocal(ws, amb)) },
    ...camadas
  ];
  const v = { valores: {}, segredos: /* @__PURE__ */ new Set(), fontes: {}, comandos: {} };
  for (const camada of todas) {
    for (const [chave, valor] of Object.entries(camada.valores)) {
      if (chave.endsWith("_CMD")) {
        const nome = chave.slice(0, -4);
        v.comandos[nome] = valor;
        v.fontes[nome] = "cmd";
        delete v.valores[nome];
      } else {
        v.valores[chave] = valor;
        v.fontes[chave] = camada.fonte;
        delete v.comandos[chave];
      }
    }
  }
  for (const [nome, cmd] of Object.entries(v.comandos)) v.valores[nome] = await rodarComando(ws, cmd);
  for (const [nome, fonte] of Object.entries(v.fontes)) if (fonte === "local" || fonte === "cmd") v.segredos.add(nome);
  return v;
}
function nomesUsados(texto) {
  return [...new Set([...texto.matchAll(NOME_VAR)].map((m) => m[1]))];
}
function substituir(texto, v, gravar = false) {
  const faltando = [];
  const r = texto.replace(NOME_VAR, (todo, nome) => {
    if (!(nome in v.valores)) {
      faltando.push(nome);
      return todo;
    }
    return gravar && v.segredos.has(nome) ? `{{${nome}}}` : v.valores[nome];
  });
  return { texto: r, faltando };
}
function resolverRequisicao(req, v, gravar = false) {
  const faltando = /* @__PURE__ */ new Set();
  const s = (t) => {
    const r = substituir(t, v, gravar);
    r.faltando.forEach((f) => faltando.add(f));
    return r.texto;
  };
  return {
    req: {
      method: req.method,
      url: s(req.url),
      headers: req.headers.map(([k, val]) => [k, s(val)]),
      body: s(req.body)
    },
    faltando: [...faltando]
  };
}
function mascarar(texto, v) {
  let r = texto;
  for (const nome of v.segredos) {
    const valor = v.valores[nome];
    if (valor && valor.length >= 4) r = r.split(valor).join(`{{${nome}}}`);
  }
  return r;
}

// src/runner/parser.ts
var CABECALHO_CENARIO = /^###\s+(T\d+)\s+(.+?)\s*$/;
function parsearPlano(md) {
  const linhas = md.replace(/\r\n/g, "\n").split("\n");
  let titulo = "";
  let secao = "";
  const textoSecao = {};
  let variaveis = {};
  const blocos = [];
  let cercaAberta = false;
  let blocoVariaveis = null;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.startsWith("```")) {
      cercaAberta = !cercaAberta;
      if (secao === "vari\xE1veis" && !cercaAberta && blocoVariaveis) {
        variaveis = { ...variaveis, ...lerEnv(blocoVariaveis.join("\n")) };
        blocoVariaveis = null;
      } else if (secao === "vari\xE1veis" && cercaAberta && linha.trim() === "```env") {
        blocoVariaveis = [];
        continue;
      }
      if (secao !== "cen\xE1rios") (textoSecao[secao] ??= []).push(linha);
      continue;
    }
    if (cercaAberta) {
      if (blocoVariaveis) blocoVariaveis.push(linha);
      else if (secao !== "cen\xE1rios") (textoSecao[secao] ??= []).push(linha);
      continue;
    }
    const h1 = /^#\s+(.+)$/.exec(linha);
    if (h1 && !titulo) {
      titulo = h1[1].replace(/^Plano de teste:\s*/i, "").trim();
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(linha);
    if (h2) {
      if (secao === "cen\xE1rios" && blocos.length) blocos[blocos.length - 1].fim = i;
      secao = h2[1].trim().toLowerCase();
      continue;
    }
    if (secao === "cen\xE1rios") {
      if (linha.startsWith("### ")) {
        if (blocos.length) blocos[blocos.length - 1].fim = i;
        blocos.push({ inicio: i, fim: linhas.length });
      }
      continue;
    }
    ;
    (textoSecao[secao] ??= []).push(linha);
  }
  const cenarios = [];
  const trechos = {};
  for (const b of blocos) {
    const trecho = linhas.slice(b.inicio, b.fim).join("\n").trimEnd();
    const cenario = parsearCenario(trecho);
    if (cenarios.some((c) => c.id === cenario.id)) cenario.erros.push(`id repetido: ${cenario.id}`);
    cenarios.push(cenario);
    trechos[cenario.id] = trecho;
  }
  return {
    titulo,
    mudanca: (textoSecao["mudan\xE7a"] ?? []).join("\n").trim(),
    variaveis,
    cenarios,
    trechos
  };
}
function parsearCenario(trecho) {
  const linhas = trecho.split("\n");
  const erros = [];
  const cab = CABECALHO_CENARIO.exec(linhas[0] ?? "");
  const cenario = {
    id: cab ? cab[1] : (linhas[0] ?? "").replace(/^#+\s*/, "").split(/\s+/)[0] || "?",
    titulo: cab ? cab[2] : (linhas[0] ?? "").replace(/^#+\s*/, ""),
    env: {},
    request: { raw: "", method: "", url: "", headers: [], body: "" },
    assercoes: [],
    erros
  };
  if (!cab) erros.push('cabe\xE7alho deve ser "### T<n> <t\xEDtulo>"');
  let blocosHttp = 0;
  let temEspera = false;
  let naEspera = false;
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.startsWith("```")) {
      const lang = linha.slice(3).trim();
      const corpo = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) corpo.push(linhas[i++]);
      if (i >= linhas.length) erros.push(`bloco ${lang || "sem linguagem"} sem fechamento`);
      if (lang === "env") cenario.env = { ...cenario.env, ...lerEnv(corpo.join("\n")) };
      else if (lang === "http") {
        blocosHttp++;
        const raw = corpo.join("\n");
        const req = parsearHttp(raw);
        if ("erro" in req) erros.push(req.erro);
        else cenario.request = { ...req, raw };
      }
      naEspera = false;
      continue;
    }
    const pre = /^Pré-condição:\s*(.*)$/i.exec(linha);
    if (pre) {
      cenario.precondicao = pre[1].trim();
      naEspera = false;
      continue;
    }
    const obj = /^Objetivo:\s*(.*)$/i.exec(linha);
    if (obj) {
      cenario.objetivo = obj[1].trim();
      naEspera = false;
      continue;
    }
    if (/^Espera:\s*$/i.test(linha)) {
      temEspera = true;
      naEspera = true;
      continue;
    }
    if (naEspera) {
      const item = /^\s*[-*]\s+(.+)$/.exec(linha);
      if (item) {
        const texto = item[1].trim();
        const p = parsearAssercao(texto);
        if (p.tipo === "erro") erros.push(`asser\xE7\xE3o "${texto}": ${p.erro}`);
        cenario.assercoes.push(texto);
      } else if (linha.trim()) naEspera = false;
    }
  }
  if (blocosHttp === 0) erros.push("sem bloco ```http");
  if (blocosHttp > 1) erros.push("mais de um bloco ```http");
  if (!temEspera) erros.push('sem "Espera:"');
  else if (!cenario.assercoes.length) erros.push('"Espera:" sem itens');
  return cenario;
}
function parsearHttp(raw) {
  const linhas = raw.split("\n");
  let i = 0;
  while (i < linhas.length && !linhas[i].trim()) i++;
  const primeira = /^([A-Z]+)\s+(\S+)(?:\s+HTTP\/[\d.]+)?\s*$/.exec(linhas[i] ?? "");
  if (!primeira) return { erro: 'primeira linha do http deve ser "M\xC9TODO URL"' };
  i++;
  const headers = [];
  for (; i < linhas.length && linhas[i].trim(); i++) {
    const h = /^([^:\s]+):\s*(.*)$/.exec(linhas[i]);
    if (!h) return { erro: `cabe\xE7alho inv\xE1lido: ${linhas[i]}` };
    headers.push([h[1], h[2]]);
  }
  const body = linhas.slice(i + 1).join("\n").trim();
  return { method: primeira[1], url: primeira[2], headers, body };
}

// src/runner/workspaces.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, readdirSync as readdirSync2, statSync } from "node:fs";
import { basename, dirname, join as join3, resolve } from "node:path";

// src/runner/erros.ts
var ErroRunner = class extends Error {
  statusCode;
  constructor(mensagem, statusCode = 400) {
    super(mensagem);
    this.statusCode = statusCode;
  }
};

// src/runner/workspaces.ts
function ehWorkspace(dir) {
  return ["CLAUDE.md", "devmove-valores.md", "doc/demandas"].every((p) => existsSync2(join3(dir, p)));
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
function normalizarDossie(arg) {
  return arg.replace(/^\.\//, "").replace(/^doc\/demandas\//, "").replace(/\/+$/, "");
}
function pastaDossie(ws, dossie) {
  return join3(ws, "doc", "demandas", dossie);
}
function lerSuite(ws, dossie) {
  if (!/^[^/.][^/]*\/[^/.][^/]*$/.test(dossie)) throw new ErroRunner(`dossi\xEA inv\xE1lido: ${dossie}`);
  const arq = join3(pastaDossie(ws, dossie), "plano-teste.md");
  if (!existsSync2(arq)) throw new ErroRunner(`plano-teste.md n\xE3o encontrado em doc/demandas/${dossie}`, 404);
  return parsearPlano(readFileSync2(arq, "utf8"));
}

// src/runner/evidencia.ts
var MAX_LINHAS_CORPO = 60;
function dataCurta(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function segundos(ms) {
  return `${(ms / 1e3).toFixed(2).replace(".", ",")}s`;
}
function aspasSimples(s) {
  return /^[A-Za-z0-9_.:/@%+=,-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}
function palavra(t, fixas) {
  if (!/\{\{/.test(t)) return aspasSimples(t);
  const esc = (s) => s.replace(/[\\"$`]/g, (c) => `\\${c}`);
  let r = "";
  let ultimo = 0;
  for (const m of t.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) {
    r += esc(t.slice(ultimo, m.index));
    r += m[1] in fixas ? esc(fixas[m[1]]) : `\${${m[1]}}`;
    ultimo = m.index + m[0].length;
  }
  r += esc(t.slice(ultimo));
  return `"${r.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}(?![A-Za-z0-9_])/g, "$$$1")}"`;
}
function comandoAbsoluto(ws, cmd) {
  const [primeiro] = cmd.split(/\s+/);
  if (primeiro.includes("/") && !primeiro.startsWith("/")) return `${join4(ws, primeiro.replace(/^\.\//, ""))}${cmd.slice(primeiro.length)}`;
  return `cd ${aspasSimples(ws)} && ${cmd}`;
}
function origens(ws, amb, suite) {
  const r = {};
  const arqAmb = join4(ws, "tools", "ambientes", `${amb}.env`);
  const camadas = [
    [existsSync3(arqAmb) ? lerEnv(readFileSync3(arqAmb, "utf8")) : {}, false],
    [existsSync3(arquivoLocal(ws, amb)) ? lerEnv(readFileSync3(arquivoLocal(ws, amb), "utf8")) : {}, true],
    [suite, false]
  ];
  for (const [valores, local] of camadas) {
    for (const [k, v] of Object.entries(valores)) {
      if (k.endsWith("_CMD")) r[k.slice(0, -4)] = { tipo: "cmd", cmd: v };
      else r[k] = local ? { tipo: "local" } : { tipo: "literal", valor: v };
    }
  }
  return r;
}
function corpoFormatado(body) {
  let texto = body;
  try {
    texto = JSON.stringify(JSON.parse(body), null, 2);
  } catch {
  }
  const linhas = texto.split("\n");
  if (linhas.length <= MAX_LINHAS_CORPO) return texto;
  return [...linhas.slice(0, MAX_LINHAS_CORPO), `... (${linhas.length - MAX_LINHAS_CORPO} linhas cortadas)`].join("\n");
}
function curl(e) {
  const c = parsearCenario(e.cenario_md);
  const req = c.request.method ? c.request : { ...e.request };
  let body = req.body;
  try {
    body = JSON.stringify(JSON.parse(body));
  } catch {
  }
  const partes = ["curl -sS", `-X ${req.method}`];
  for (const [k, v] of req.headers) partes.push(`-H ${palavra(`${k}: ${v}`, c.env)}`);
  if (body) partes.push(`-d ${palavra(body, c.env)}`);
  partes.push(palavra(req.url, c.env));
  return partes.join(" ");
}
function obtidoTexto(v) {
  return v === void 0 ? "nada" : JSON.stringify(v);
}
function gerarEvidencia(ws, dossie, amb) {
  const repo = repositorio(ws);
  const suite = lerSuite(ws, dossie);
  const ultimas = /* @__PURE__ */ new Map();
  for (const e of repo.execucoesDoDossie(dossie, amb)) if (!ultimas.has(e.cenario)) ultimas.set(e.cenario, e);
  if (!ultimas.size) return null;
  const rodadas = /* @__PURE__ */ new Map();
  for (const e of ultimas.values()) if (!rodadas.has(e.rodada_id)) rodadas.set(e.rodada_id, repo.rodada(e.rodada_id, suite.cenarios.length));
  const listaRodadas = [...rodadas.values()].sort((a, b) => a.id - b.id).map((r) => `#${r.id} (${r.origem}, ${dataCurta(r.iniciada_em)})`);
  const execs = suite.cenarios.map((c) => ultimas.get(c.id)).filter((e) => !!e);
  for (const e of ultimas.values()) if (!execs.includes(e)) execs.push(e);
  const usados = [];
  for (const e of execs) {
    const c = parsearCenario(e.cenario_md);
    const t = [c.request.url, ...c.request.headers.map(([k, v]) => `${k}: ${v}`), c.request.body].join("\n");
    for (const n of nomesUsados(t)) if (!usados.includes(n)) usados.push(n);
  }
  const orig = origens(ws, amb, suite.variaveis);
  const exports = [];
  if (usados.some((n) => orig[n]?.tipo === "local")) exports.push(`set -a; . ${aspasSimples(arquivoLocal(ws, amb))}; set +a`);
  for (const n of usados) {
    const o = orig[n];
    if (!o) exports.push(`export ${n}=  # sem valor no ambiente`);
    else if (o.tipo === "literal") exports.push(`export ${n}=${aspasSimples(o.valor)}`);
    else if (o.tipo === "cmd") exports.push(`export ${n}=$(${comandoAbsoluto(ws, o.cmd)})`);
  }
  const md = [
    `# Evid\xEAncias: ${amb}`,
    "",
    `Gerado pelo painel. Rodadas: ${listaRodadas.join(", ")}`,
    "",
    "```bash",
    ...exports,
    "```"
  ];
  for (const e of execs) {
    md.push("", `## ${e.cenario} ${e.titulo}`);
    const cmd = curl(e);
    md.push(cmd.includes("\n") ? ["```bash", cmd, "```"].join("\n") : `\`${cmd}\``);
    if (e.resposta) {
      md.push(`HTTP ${e.resposta.status} \xB7 ${segundos(e.resposta.tempo_ms)} \xB7 rodada #${e.rodada_id}`);
      md.push("```json", corpoFormatado(e.resposta.body), "```");
    } else {
      md.push(`Erro: ${e.erro ?? "sem resposta"} \xB7 rodada #${e.rodada_id}`);
    }
    for (const a of e.assercoes) {
      if (a.tipo === "manual") md.push(`- [ ] ${a.texto} (manual)`);
      else if (a.ok) md.push(`- [x] ${a.texto}`);
      else if (a.ok === null) md.push(`- [ ] ${a.texto} (n\xE3o avaliada)`);
      else md.push(`- [ ] ${a.texto} (obtido: ${obtidoTexto(a.obtido)})`);
    }
    let linha = e.veredito;
    if (e.veredito !== e.veredito_auto) linha += ` (autom\xE1tico: ${e.veredito_auto})`;
    if (e.nota) linha += ` \xB7 nota: ${e.nota}`;
    md.push(linha);
  }
  const dir = join4(pastaDossie(ws, dossie), "evidencias");
  mkdirSync2(dir, { recursive: true });
  const arq = join4(dir, `${amb}.md`);
  writeFileSync(arq, `${md.join("\n")}
`);
  return arq;
}

// src/runner/http.ts
var TIMEOUT_MS = 3e4;
async function enviar(req, sinal) {
  const tempo = AbortSignal.timeout(TIMEOUT_MS);
  const signal = sinal ? AbortSignal.any([tempo, sinal]) : tempo;
  const semCorpo = req.method === "GET" || req.method === "HEAD";
  const inicio = performance.now();
  try {
    const r = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: semCorpo || !req.body ? void 0 : req.body,
      signal
    });
    const bytes = new Uint8Array(await r.arrayBuffer());
    const tempo_ms = Math.round(performance.now() - inicio);
    return {
      resposta: {
        status: r.status,
        headers: [...r.headers.entries()],
        body: new TextDecoder().decode(bytes),
        tempo_ms,
        tamanho: bytes.byteLength
      },
      erro: null
    };
  } catch (e) {
    if (sinal?.aborted) return { resposta: null, erro: "interrompida" };
    if (tempo.aborted) return { resposta: null, erro: `timeout de ${TIMEOUT_MS / 1e3}s` };
    const err = e;
    const causa = err.cause?.code ?? err.cause?.message;
    return { resposta: null, erro: `falha de rede: ${causa ?? err.message}` };
  }
}

// src/runner/executor.ts
var RODADA_ORFA_MS = 5 * 60 * 1e3;
function mascararResposta(r, v) {
  if (!r) return r;
  return { ...r, body: mascarar(r.body, v), headers: r.headers.map(([k, val]) => [k, mascarar(val, v)]) };
}
async function rodarCenario(ws, amb, camadas, req, assercoes, sinal) {
  let v;
  try {
    v = await resolverVariaveis(ws, amb, camadas);
  } catch (e) {
    return { request: req, resposta: null, erro: e.message, assercoes: avaliar(assercoes, null) };
  }
  const real = resolverRequisicao(req, v);
  const gravada = resolverRequisicao(req, v, true).req;
  if (real.faltando.length) {
    return { request: gravada, resposta: null, erro: `vari\xE1vel faltando: ${real.faltando.join(", ")}`, assercoes: avaliar(assercoes, null) };
  }
  const { resposta, erro } = await enviar(real.req, sinal);
  return {
    request: gravada,
    resposta: mascararResposta(resposta, v),
    erro: erro && mascarar(erro, v),
    assercoes: avaliar(assercoes, resposta)
  };
}
function iniciarRodada(o) {
  const suite = lerSuite(o.ws, o.dossie);
  const repo = repositorio(o.ws);
  let cenarios = suite.cenarios;
  if (o.cenarios?.length) {
    const pedidos = o.cenarios.map((c) => c.trim().toUpperCase());
    const faltam = pedidos.filter((p) => !cenarios.some((c) => c.id === p));
    if (faltam.length) throw new ErroRunner(`cen\xE1rio n\xE3o existe no plano: ${faltam.join(", ")}`);
    cenarios = cenarios.filter((c) => pedidos.includes(c.id));
  }
  conferirAmbiente(o.ws, o.ambiente);
  const ativa = repo.emExecucao(o.dossie);
  if (ativa) {
    const atividade = repo.ultimaAtividade(ativa.id) || ativa.iniciada_em;
    if (Date.now() - Date.parse(atividade) < RODADA_ORFA_MS) {
      throw new ErroRunner(`rodada #${ativa.id} ainda em execu\xE7\xE3o neste dossi\xEA`, 409);
    }
    repo.finalizarRodada(ativa.id, "interrompida");
  }
  const rodadaId = repo.criarRodada({
    dossie: o.dossie,
    ambiente: o.ambiente,
    origem: o.origem ?? "agent",
    autor: o.autor,
    iniciada_em: (/* @__PURE__ */ new Date()).toISOString()
  });
  const total = suite.cenarios.length;
  const fim = (async () => {
    try {
      for (const c of cenarios) {
        if (o.sinal?.aborted) break;
        if (c.erros.length) {
          o.aoPular?.(c);
          continue;
        }
        const camadas = [
          { fonte: "suite", valores: suite.variaveis },
          { fonte: "cenario", valores: c.env }
        ];
        const r = await rodarCenario(o.ws, o.ambiente, camadas, c.request, c.assercoes, o.sinal);
        if (o.sinal?.aborted) break;
        const auto = vereditoAuto(r.assercoes, r.erro);
        const dados = {
          rodada_id: rodadaId,
          cenario: c.id,
          titulo: c.titulo,
          ordem: suite.cenarios.indexOf(c) + 1,
          cenario_md: suite.trechos[c.id] ?? "",
          request: r.request,
          resposta: r.resposta,
          erro: r.erro,
          assercoes: r.assercoes,
          veredito: auto,
          veredito_auto: auto,
          nota: null,
          executada_em: (/* @__PURE__ */ new Date()).toISOString()
        };
        const id = repo.inserirExecucao(dados);
        o.aoExecutar?.(semMd({ id, ...dados }), c);
      }
      repo.finalizarRodada(rodadaId, o.sinal?.aborted ? "interrompida" : "concluida");
    } catch (e) {
      repo.finalizarRodada(rodadaId, "interrompida");
      throw e;
    } finally {
      try {
        gerarEvidencia(o.ws, o.dossie, o.ambiente);
      } catch {
      }
    }
    const rodada = repo.rodada(rodadaId, total);
    o.aoTerminar?.(rodada);
    return rodada;
  })();
  return { rodada_id: rodadaId, fim };
}
function conferirAmbiente(ws, amb) {
  if (!listarAmbientes(ws).includes(amb)) throw new ErroRunner(`ambiente desconhecido: ${amb}`);
}
var VEREDITOS = ["PASSOU", "FALHOU", "BLOQUEADO", "PENDENTE"];
function mudarVeredito(ws, execucaoId, veredito, nota) {
  const v = veredito?.toUpperCase();
  if (!VEREDITOS.includes(v)) throw new ErroRunner(`veredito inv\xE1lido: ${veredito}. Use ${VEREDITOS.join(", ")}`);
  const repo = repositorio(ws);
  const e = repo.execucao(execucaoId);
  if (!e) throw new ErroRunner(`execu\xE7\xE3o #${execucaoId} n\xE3o existe`, 404);
  repo.mudarVeredito(execucaoId, v, nota?.trim() || null);
  const rodada = repo.db.prepare("select dossie, ambiente from rodadas where id = ?").get(e.rodada_id);
  gerarEvidencia(ws, rodada.dossie, rodada.ambiente);
  return semMd(repo.execucao(execucaoId));
}

// src/runner/cli.ts
var USO = `Uso: tools/qa.sh <comando> <dossi\xEA> [args]
  validar <dossi\xEA>
  run <dossi\xEA> <ambiente> [T1,T3] [--autor nina-qa]
  veredito <dossi\xEA> <ambiente> <Tn> <PASSOU|FALHOU|BLOQUEADO|PENDENTE> "<nota>"
  rodadas <dossi\xEA>
<dossi\xEA>: qa/<slug> ou doc/demandas/qa/<slug>`;
function sair(msg, codigo = 2) {
  console.error(msg);
  process.exit(codigo);
}
function curto(texto) {
  return texto.replace(/`/g, "").replace(/\[\?\(.*?\)\]/g, "[...]");
}
function falhas(a) {
  return a.filter((x) => x.tipo === "auto" && x.ok === false).map((x) => `${curto(x.texto)} (obtido ${x.obtido === void 0 ? "nada" : JSON.stringify(x.obtido)})`).join("; ");
}
function linhaExecucao(e) {
  const partes = [e.cenario, e.veredito];
  if (e.resposta) partes.push(String(e.resposta.status), segundos(e.resposta.tempo_ms));
  if (e.erro) partes.push(`erro: ${e.erro}`);
  const f = falhas(e.assercoes);
  if (f) partes.push(f);
  const manuais = e.assercoes.filter((a) => a.tipo === "manual").length;
  if (e.veredito === "PENDENTE" && manuais) partes.push(`${manuais} asser\xE7\xE3o(\xF5es) manual(is)`);
  return partes.join(" ");
}
function placarTexto(p) {
  return `${p.passou} passou, ${p.falhou} falhou, ${p.pendente} pendente, ${p.bloqueado} bloqueado, ${p.nao_executado} n\xE3o executado`;
}
async function main() {
  const args = process.argv.slice(2);
  let autor = "nina-qa";
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--autor") autor = args[++i] ?? sair("--autor sem valor");
    else if (args[i].startsWith("--autor=")) autor = args[i].slice(8);
    else if (args[i] === "-h" || args[i] === "--help") sair(USO, 0);
    else pos.push(args[i]);
  }
  const [comando, dossieArg] = pos;
  if (!comando || !dossieArg) sair(USO);
  const ws = acharWorkspace(process.cwd()) ?? sair("workspace n\xE3o encontrado (pasta com CLAUDE.md e doc/demandas/)");
  const dossie = normalizarDossie(dossieArg);
  let suite;
  try {
    suite = lerSuite(ws, dossie);
  } catch (e) {
    sair(e.message);
  }
  if (comando === "validar") {
    let erros = 0;
    if (!suite.cenarios.length) {
      console.log("plano sem cen\xE1rios (### T<n> <t\xEDtulo> dentro de ## Cen\xE1rios)");
      erros++;
    }
    for (const c of suite.cenarios) {
      if (!c.erros.length) console.log(`${c.id} ok ${c.titulo}`);
      for (const e of c.erros) console.log(`${c.id} erro: ${e}`);
      erros += c.erros.length;
    }
    console.log(erros ? `${erros} erro(s)` : `${suite.cenarios.length} cen\xE1rio(s) v\xE1lidos`);
    process.exit(erros ? 1 : 0);
  }
  if (comando === "run") {
    const [, , amb, lista] = pos;
    if (!amb) sair(USO);
    const ctrl = new AbortController();
    process.on("SIGINT", () => ctrl.abort());
    let r;
    try {
      r = iniciarRodada({
        ws,
        dossie,
        ambiente: amb,
        cenarios: lista ? lista.split(",").filter(Boolean) : void 0,
        autor,
        sinal: ctrl.signal,
        aoExecutar: (e) => console.log(linhaExecucao(e)),
        aoPular: (c) => console.log(`${c.id} NAO_EXECUTADO plano com erro: ${c.erros.join("; ")}`)
      });
    } catch (e) {
      sair(e.message);
    }
    const rodada = await r.fim;
    const evid = relative(ws, `${pastaDossie(ws, dossie)}/evidencias/${amb}.md`);
    console.log(`rodada #${rodada.id} ${rodada.status} \xB7 ${placarTexto(rodada.placar)} \xB7 ${evid}`);
    return;
  }
  if (comando === "veredito") {
    const [, , amb, cen, veredito, nota] = pos;
    if (!amb || !cen || !veredito) sair(USO);
    const e = repositorio(ws).ultimaExecucao(dossie, amb, cen.toUpperCase());
    if (!e) sair(`nenhuma execu\xE7\xE3o de ${cen} em ${amb}`);
    try {
      const nova = mudarVeredito(ws, e.id, veredito, nota ?? null);
      console.log(`${nova.cenario} ${nova.veredito} (autom\xE1tico: ${nova.veredito_auto}) \xB7 rodada #${nova.rodada_id}${nova.nota ? ` \xB7 nota: ${nova.nota}` : ""}`);
    } catch (err) {
      sair(err.message);
    }
    return;
  }
  if (comando === "rodadas") {
    const rodadas = repositorio(ws).rodadas(dossie, suite.cenarios.length);
    if (!rodadas.length) console.log("nenhuma rodada");
    for (const r of rodadas) {
      console.log(`#${r.id} ${r.ambiente} ${r.origem} ${r.autor} ${r.status} ${dataCurta(r.iniciada_em)} \xB7 ${placarTexto(r.placar)}`);
    }
    return;
  }
  sair(USO);
}
main().catch((e) => sair(`erro: ${e.message}`, 1));
