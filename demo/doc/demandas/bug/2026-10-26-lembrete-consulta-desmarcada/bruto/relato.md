Achado fora de escopo em feature/2026-10-26-desmarcar-consulta-recepcao.

A recepção passa a desmarcar consultas (estado `desmarcada` na api), mas o lembrete de WhatsApp agendado 24h antes (mensageria, `AgendarLembrete`) não é cancelado: o paciente recebe lembrete de uma consulta que não existe mais. A api não publica evento de consulta desmarcada; a correção provavelmente precisa dele (`EventosPublisher.publicar`) e de um consumidor na mensageria.
