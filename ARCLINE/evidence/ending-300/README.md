# Ending v3.0.0 / application0.18.0 local validation

17 unit suites, 11 browser suites (one version-page link failure corrected and rerun),90 generated outputs reproduced twice,visual regression and4x CPU hosted/package delivery. See INITIAL_BROWSER_SUITE.json for the first failure and RELEASE_WEB.json for the successful complete rerun.

MEDIA_220_BROWSER.json records the unaccelerated171333ms native AAC run,11 scenes,all42 subjects,all9 phases and return to the chapter menu. MEDIA_FINAL_REGRESSION.json records the subsequent92-check fast regression; it does not replace the real-time run. ENDING_300_BROWSER.json covers all42 subjects in JA/EN,4 sizes,portrait,reduced motion,zero storage/SDK,replay,legacy preview and missing-script retry.

ENDING_300_ASSETS.json compares every RGB byte against the hashed original crop. MASK_REPRODUCTION.json reruns the optional OpenCV5.0.0.93 preparation and reproduces all10 alpha hashes. Regular build uses only Pillow and reviewed alpha sources.

BUNDLE_CHECK.json describes the147-entry ZIP outside Git,including42 cutouts. GENERATED.json verifies90 outputs twice without touching the source tree.

Local Chromium154 emulation only. Physical Safari/Android,PWA,production YouTube SDK,perceptual music/bass/beat evaluation,and public-domain rendering are unverified. Network policy blocks the public Pages domain; deployment status is separate. CI and Pages results are linked from the final report/PR.
