'use strict';
// Older releases use the current integration's explicit preservation boundary.
module.exports=(file,base,equal)=>require('./integration-preservation.cjs').verify(file,equal);
