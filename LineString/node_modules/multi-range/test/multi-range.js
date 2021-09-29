/*global describe:true, it:true, before:true, after:true, beforeEach:true, afterEach:true */
var range = require('../')
  , expect = require('chai').expect

function testRange(str, arr) {
  it(JSON.stringify(str) + ' => ' + JSON.stringify(arr), function () {
    expect(range(str)).to.deep.equal(arr)
  })
}

function testCompile(arr, str) {
  it(JSON.stringify(arr) + ' => ' + JSON.stringify(str), function () {
    expect(range.compile(arr)).to.equal(str)
  })
}

function verifyCompile(arr) {
  it(JSON.stringify(arr) + ' <=> ' + JSON.stringify(arr), function () {
    console.log(range.compile(arr))
    expect(range(range.compile(arr))).to.deep.equal(arr)
  })
}

function test(str, arr) {
  testRange(str, arr)
  testCompile(arr, str)
}

describe('multi-range', function () {
  test('42', [42])
  test('20-22', [20, 21, 22])
  test('5-1', [5,4,3,2,1])
  test('1-9x2', [1,3,5,7,9])

  testRange('10-11,30-31', [10, 11, 30, 31])
  testRange('1,3-4,6-8', [1,3,4,6,7,8])
  testRange('1,3,5,7,9', [1,3,5,7,9])

  testCompile([1,10,100,1000], '1,10,100,1000')
  testCompile([1,2,4,7,11], '1,2,4,7,11')
  testCompile([1,2,3,4,5,11,12,13,14,15], '1-5,11-15')
  testCompile([1,3,5,11,13,15], '1-5x2,11-15x2')
  testCompile([5,3,1,15,13,11], '5-1x2,15-11x2')
})
