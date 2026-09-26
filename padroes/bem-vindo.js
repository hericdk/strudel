// Bem-vindo ao Strudel!
// Ctrl+Enter  → toca / aplica as mudanças
// Ctrl+.      → para tudo
//
// Cada linha que começa com "$:" é uma camada tocando ao mesmo tempo.
// Mude um número ou um som e aperte Ctrl+Enter de novo: a música muda sem parar.

setcps(0.5) // velocidade: ciclos por segundo

// bateria: bd = bumbo, sd = caixa, hh = chimbal
$: s("bd*2, ~ sd, hh*8").bank("RolandTR909")

// baixo: notas em sequência, uma por passo
$: note("<c2 a1 f1 g1>*4").s("sawtooth").lpf(600)

// acordes suaves com reverb
$: note("<[c3,e3,g3] [a2,c3,e3] [f2,a2,c3] [g2,b2,d3]>")
  .s("piano").room(0.5).gain(0.6)
