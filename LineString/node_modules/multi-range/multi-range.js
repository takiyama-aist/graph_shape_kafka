//
// Flattens an Array of Arrays and other content into a single-depth Array.
//
function flatten(arr) {
  if (!Array.isArray(arr)) {
    return arr
  }

  return arr.reduce(function (all, piece) {
    return all.concat(flatten(piece))
  }, [])
}

//
// Returns an Array of Integers from **from** to **to** by **delta**, inclusive.
//
function range(from, to, delta) {
  var arr = []

  delta = delta || 1

  if (from > to) {
    for (; from >= to; from -= delta) {
      arr.push(from)
    }
  } else {
    for (; from <= to; from += delta) {
      arr.push(from)
    }
  }

  return arr
}

//
// Returns an Array of Integers based on the content of **str**.
//
function parseRange(str) {
  var params = str.split('x')
  var numbers = params[0].split('-')
  var delta = parseInt(params[1], 10)

  numbers = numbers.map(function (num) {
    return parseInt(num, 10)
  })

  if (numbers.length > 1) {
    numbers = numbers.reduce(function (prev, curr) {
      return range(prev, curr, delta)
    })
  }

  return flatten(numbers)
}

//
// Returns an Array of Integers based on the content of **str**.
//
function parseMultiRange(str) {
  return flatten(str.split(',').map(parseRange))
}

//
// Returns a String range given a String range and the next adjacent value.
//
function addToRange(str, value) {
  var arr = str.split('-')
  if (arr.length === 1) {
    arr.push(value)
  } else {
    arr[arr.length - 1] = value
  }
  return arr.join('-')
}

//
// Returns a `range`-compatible Array of Strings, given an Array of Numbers.
//
function compileMultiRange(arr) {
  var retval = []

  retval = arr
    .map(Number)
    .reduce(function (arr, value, index) {
      arr[index] = {
        value: value,
        delta: arr[0] ? (value - arr[index - 1].value) : 0
      }

      return arr
    }, new Array(arr.length))
    .reduce(function (arr, curr) {
      var prev = arr[arr.length - 1]

      switch (typeof (prev && prev.value)) {
        // Adding to an existing range.
        case 'string':
          // If we're extending the range, add the number accordingly.
          if (prev.delta === curr.delta) {
            prev.value = addToRange(prev.value, curr.value)
            return arr
          }

          // Otherwise, we're breaking the range. Reset the delta accordingly.
          curr.delta = 0
          arr.push(curr)
          return arr

        // Adding to a plain value.
        case 'number':
          // If we're the third value with a consistent delta, create a range.
          prev = arr.slice(-2)

          if (
            prev.length === 2 &&
            typeof prev[0].value === 'number' &&
            typeof prev[1].value === 'number' &&
            (prev[0].delta === prev[1].delta || prev[0].delta === 0) &&
            prev[1].delta === curr.delta
          ) {
            prev[0].value = prev[0].value + '-' + curr.value
            prev[0].delta = curr.delta
            arr.pop()
            return arr
          }

          // Purposeful fallthrough.
          arr.push(curr)
          return arr

        // We're the first value. Push and continue.
        default:
          arr.push(curr)
          return arr
      }
    }, [])
    .map(function (obj) {
      if (typeof obj.value === 'string' && Math.abs(obj.delta) > 1) {
        return obj.value + 'x' + Math.abs(obj.delta)
      }

      return obj.value
    })

  return retval.join(',')
}

//
// Export `parseMultiRange`.
//
module.exports = parseMultiRange
module.exports.range = parseMultiRange
module.exports.compile = compileMultiRange
