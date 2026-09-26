// Brincando com ritmo.
// Dicas de mini-notação dentro das aspas:
//   "a b"   → dois passos no mesmo tempo
//   "a*4"   → repete 4 vezes
//   "~"     → silêncio
//   "<a b>" → alterna a cada ciclo
//   "[a b]" → agrupa num passo só

setcps(0.55)

$: s("bd ~ bd ~, ~ sd ~ sd").bank("RolandTR808")

$: s("hh*8").bank("RolandTR808")
  .gain("0.4 0.2 0.5 0.2")   // volume varia em cada batida
  .pan(sine.slow(4))         // passeia entre esquerda e direita

$: s("<~ cp>*2").bank("RolandTR808").room(0.3)
