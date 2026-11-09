'use strict';
// Reuse persistence/UI coverage without replaying unrelated native media.
process.env.ARCLINE_MENU_ONLY='1';
require('./start-landscape-0171-browser.test.cjs');
