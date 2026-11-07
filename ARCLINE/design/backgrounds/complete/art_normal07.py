from art_core import Scene

def make():
 s=Scene('normal-07','プリズム城壁',7,'夕空を受けた、菱形の面を持つ葡萄色の城壁。斜めに伸びる壁、琥珀の縁取り、青い鉱石のはめ込み。自然の水晶原とは異なる、鉱物を加工した幾何学の防壁。',{
 'sky':'#E2C3C3','skyHigh':'#C3A5BC','air':'#EDD4C1','far':'#B7A2B7','farShade':'#9B8EA9',
 'wall':'#A97890','wallLit':'#CF9AA6','wallShade':'#865E80','wallDeep':'#6E5275','plum':'#9C7899',
 'rose':'#D3ACBA','blue':'#8CA7BF','blueDark':'#6E89AA','blueLit':'#B1C3CE','gold':'#D7BA8C','goldLight':'#ECD5A9',
 'ground':'#B39CA9','groundLit':'#D1B8B9','groundShade':'#907D98','tile':'#B8ADC1','tileShade':'#958DAA'})
 s.base()
 s.p('skyHigh','M0 0 H1120 V182 C991 160 888 186 743 161 C552 128 370 177 205 152 C120 138 55 157 0 146 Z','air')
 s.p('air','M0 295 C194 277 367 312 554 284 C758 253 945 282 1120 261 V604 H0 Z','air')
 s.p('far','M0 389 L103 359 L221 368 L305 341 L408 374 L510 367 L655 411 L802 379 L932 399 L1046 365 L1120 379 V604 H0 Z','far')
 s.p('farShade','M0 435 L117 403 L237 418 L340 385 L475 424 L605 414 L716 447 L883 413 L1012 435 L1120 421 V604 H0 Z','far')
 s.p('ground','M0 475 L402 439 L713 456 L1120 423 V604 H0 Z','middle')
 # The long wall recedes to the left; its outline is a cut gemstone, not a gate.
 s.p('wall','M0 276 L204 302 L431 329 L642 304 L841 267 L860 481 L633 488 L414 519 L205 479 L0 462 Z','land')
 s.p('wallLit','M0 276 L204 302 L431 329 L642 304 L841 267 L849 285 L645 326 L432 348 L204 322 L0 297 Z','land')
 s.p('wallShade','M0 414 L205 430 L414 472 L633 448 L858 436 L860 481 L633 488 L414 519 L205 479 L0 462 Z','land')
 s.p('gold','M0 295 L205 319 L432 345 L645 323 L847 282 L850 294 L646 336 L431 358 L204 332 L0 307 Z','structure')
 s.p('wallDeep','M206 333 L222 335 L222 477 L205 479 Z','structure')
 s.p('wallDeep','M421 356 L435 357 L429 518 L414 519 Z','structure')
 s.p('wallDeep','M641 337 L653 334 L647 486 L633 488 Z','structure')
 panels=[('rose','M39 363 L94 339 L144 374 L89 412 Z'),('wallShade','M94 339 L144 374 L89 412 L99 373 Z'),
 ('blue','M257 389 L313 366 L370 407 L310 445 Z'),('blueDark','M313 366 L370 407 L310 445 L320 404 Z'),
 ('gold','M465 399 L520 374 L571 399 L519 439 Z'),('wallLit','M520 374 L571 399 L519 439 L526 402 Z'),
 ('blueLit','M687 367 L737 337 L790 357 L741 402 Z'),('blueDark','M737 337 L790 357 L741 402 L748 368 Z')]
 for c,d in panels:s.p(c,d,'structure')
 s.p('wallShade','M826 157 L915 98 L1009 148 L1041 399 L955 473 L850 437 Z','structure')
 s.p('wallLit','M826 157 L915 98 L922 193 L938 446 L850 437 Z','structure')
 s.p('wall','M915 98 L1009 148 L1041 399 L955 473 L938 446 L922 193 Z','structure')
 s.p('goldLight','M826 157 L915 98 L1009 148 L992 160 L915 123 L845 169 Z','structure')
 s.p('gold','M850 437 L938 446 L955 473 L850 456 Z','structure')
 s.p('gold','M938 446 L1041 399 L1044 419 L955 473 Z','structure')
 s.p('blue','M870 217 L907 188 L915 302 L879 335 Z','structure')
 s.p('blueLit','M870 217 L881 209 L891 325 L879 335 Z','structure')
 s.p('blueDark','M961 206 L995 181 L1006 292 L974 330 Z','structure')
 s.p('rose','M890 367 L917 339 L920 401 L895 418 Z','structure')
 # A few cut crenels follow the wall's perspective rather than one repeated stamp.
 for c,d in [('wall','M43 281 V250 L76 254 L79 286 Z'),('goldLight','M43 250 L54 244 L87 249 L76 254 Z'),
 ('wall','M271 311 V278 L301 282 L304 315 Z'),('goldLight','M271 278 L283 272 L312 277 L301 282 Z'),
 ('wall','M562 314 L563 279 L589 276 L589 311 Z'),('goldLight','M563 279 L574 269 L600 267 L589 276 Z'),
 ('wall','M747 282 L747 245 L773 238 L775 278 Z'),('goldLight','M747 245 L758 234 L783 228 L773 238 Z')]:s.p(c,d,'structure')
 s.p('groundShade','M0 560 L249 521 L460 557 L734 529 L1120 543 V604 H0 Z','near')
 s.p('groundLit','M326 604 L464 563 L585 576 L486 604 Z','near')
 s.p('tile','M707 551 L774 527 L842 539 L778 565 Z','near')
 s.p('tileShade','M778 565 L842 539 L840 551 L779 576 Z','near')
 return s.data
