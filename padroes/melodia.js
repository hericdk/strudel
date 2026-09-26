// Melodia usando escala: os números viram notas da escala escolhida.
// .pianoroll() desenha as notas na tela enquanto toca.

setcps(0.5)

$: n("0 2 4 <7 6> 4 2 <1 3> ~")
  .scale("C4:minor")
  .s("triangle")
  .lpf(sine.range(400, 3000).slow(8))  // filtro abre e fecha devagar
  .delay(0.3)
  .pianoroll()

$: n("<0 -3 -2 -4>").scale("C2:minor").s("sawtooth").lpf(400)
