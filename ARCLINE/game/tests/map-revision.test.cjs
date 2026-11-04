'use strict';
const assert=require('assert/strict'),E=require('../dist/engine.js'),base=require('./fixtures/integration-baseline.json');
for(const old of base.levels.slice(50))for(const [key,value] of Object.entries(old))assert.deepEqual(E.levels[old.id-1][key],value,'protected stage '+old.id+'/'+key);
require('./integration-preservation.cjs').verify('geometry.js');
console.log('PASS current approved-map boundary: 51-100 data and 150 dynamic collision worlds');
