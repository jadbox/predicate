/**
 * @license predicate.js
 * (c) 2014-2015 Trevor Landau <landautrevor@gmail.com> @trevor_landau
 * predicate.js may be freely distributed under the MIT license.
 */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.predicate=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var utils = require('./lib/utils');
var predicate = {};
predicate.VERSION = '0.12.0';

[
  utils,
  require('./lib/predicates'),
  require('./lib/chain'),
  require('./lib/other'),
].reduce(utils.assign, predicate);

module.exports = predicate;

},{"./lib/chain":2,"./lib/other":3,"./lib/predicates":4,"./lib/utils":5}],2:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var predicates = require('./predicates');
var predicate = module.exports;

// chaining mixin
function lazy() {
  /* jshint validthis:true */

  // Enable invocation with operators (+, !, etc)
  this.valueOf = function () {
    return this.val();
  };

  this.val = function () {
    return this.lazy.map(function (args) {
      return args[0].apply(null, args[1]);
    })[this.method](predicates.truthy);
  };

  return this;
}

function Every() {
  this.method = 'every';
  this.lazy = [];
}

Every.prototype = Object.keys(predicates).reduce(function (acc, fnName) {
  if (!predicates.fn(predicates[fnName])) return acc;

  acc[fnName] = function() {
    this.lazy.push([predicates[fnName], arguments]);
    return this;
  };

  return acc;
}, {});

lazy.call(Every.prototype);

predicate.all = predicate.every = function () {
  return new Every();
};

function Some() {
  this.method = 'some';
  this.lazy = [];
}

Some.prototype = utils.assign({}, Every.prototype);
lazy.call(Some.prototype);

predicate.any = predicate.some = function () {
  return new Some();
};

},{"./predicates":4,"./utils":5}],3:[function(require,module,exports){
'use strict';

var predicates = require('./predicates');
var utils = require('./utils');
var predicate = module.exports;

predicate.ternary = function (pred, a, b) {
  if (predicates.bool(pred)) return pred ? a : b;
  if (predicates.undef(a)) return utils.partial(predicate.ternary, pred);
  if (predicates.undef(b)) return utils.partial(predicate.ternary, pred, a);
  return predicate.ternary(pred(a, b), a, b);
};

},{"./predicates":4,"./utils":5}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var predicate = module.exports;

var curry = utils.curry;

if (Object.is) {
  predicate.is = curry(Object.is);
} else {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  predicate.is = curry(function(v1, v2) {
    if (v1 === 0 && v2 === 0) {
      return 1 / v1 === 1 / v2;
    }
    if (v1 !== v1) {
      return v2 !== v2;
    }
    return v1 === v2;
  });
}

predicate.exists = function (val) {
  return val != null;
};

predicate.truthy = function (val) {
  // coerce for null != null
  return !!(val && predicate.exists(val));
};

predicate.falsey = utils.complement(predicate.truthy);

//---- value comparision methods

predicate.equal = curry(function (a, b) {
  return a === b;
});

predicate.eq = curry(function (a, b) {
  return a == b;
});

predicate.null = predicate.equal(null);
predicate.undef = predicate.equal(undefined);

predicate.lt = predicate.less = curry(function (a, b) {
  return a < b;
});

predicate.ltEq = predicate.le = predicate.lessEq = curry(function (a, b) {
  return predicate.equal(a, b) || predicate.less(a, b);
});

predicate.gt = predicate.greater = curry(function (a, b) {
  return a > b;
});

predicate.gtEq = predicate.ge = predicate.greaterEq = curry(function (a, b) {
  return predicate.equal(a, b) || predicate.greater(a, b);
});

// --- Type checking predicates

// Forces objects toString called returned as [object Object] for instance
var __toString = Object.prototype.toString;
var eqToStr = curry(function(str, val) {
  return predicate.equal(str, __toString.call(val));
});

//---- Object type checks

predicate.object = predicate.obj = function (val) {
  return val === Object(val);
};

predicate.array = predicate.arr = Array.isArray || eqToStr('[object Array]');
predicate.date = eqToStr('[object Date]');
predicate.regex = predicate.regexp = predicate.rgx = predicate.RegExp = eqToStr('[object RegExp]');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
predicate.finite = Number.isFinite || function (val) {
  return predicate.number(val) && isFinite(val);
};

predicate.nan = predicate.NaN = predicate.is(NaN);

predicate.instance = curry(function (Cls, inst) {
  return inst instanceof Cls;
});

predicate.arguments = eqToStr('[object Arguments]');
predicate.error = predicate.instance(Error);

// creates fns for predicate.string, etc
var typeofBuilder = curry(function(type, val) {
  return predicate.equal(type, typeof val);
});

//--- Create typeof methods

// type of string and alias name
// predicate.fn, predicate.num, etc
[
  ['function', 'fn'],
  ['string', 'str'],
  ['boolean', 'bool']
].reduce(function (predicate, type) {
  predicate[type[0]] = predicate[type[1]] = typeofBuilder(type[0]);
  return predicate;
}, predicate);

predicate.number = predicate.num = function(val) {
  return typeof val === 'number' && predicate.not.NaN(val);
};

predicate.int = function (val) {
  return predicate.num(val) && predicate.zero(utils.mod(val, 1));
};

predicate.pos = function (val) {
  return predicate.num(val) && predicate.greater(val, 0);
};

predicate.neg = function (val) {
  return predicate.num(val) && predicate.less(val, 0);
};

predicate.zero = function (val) {
  return predicate.num(val) && predicate.equal(val, 0);
};

predicate.even = function (val) {
  return predicate.num(val) &&
          predicate.not.zero(val) &&
          predicate.zero(utils.mod(val, 2));
};

predicate.odd = function (val) {
  return predicate.num(val) &&
          predicate.not.zero(val) &&
          predicate.not.zero(utils.mod(val, 2));
};

predicate.contains = curry(function (arr, val) {
  if (!predicate.array(arr)) throw new TypeError('Expected an array');
  if (predicate.NaN(val)) {
    return arr.some(predicate.NaN);
  }
  return !!~arr.indexOf(val);
});

var __has = Object.prototype.hasOwnProperty;
predicate.has = curry(function has(o, key) {
  return __has.call(o, key);
});

predicate.empty = function (o) {
  if (predicate.not.exists(o)) return true;
  if (predicate.arr(o) || predicate.str(o)) return !o.length;
  if (predicate.obj(o)) {
    for (var k in o) if (predicate.has(o, k)) return false;
    return true;
  }
  throw new TypeError();
};

predicate.primitive = function (val) {
  return predicate.string(val) || predicate.num(val) || predicate.bool(val) ||
    predicate.null(val) || predicate.undef(val) || predicate.NaN(val);
};

predicate.matches = curry(function matches(rgx, val) {
  return rgx.test(val);
});

// Assign inverse of each predicate
predicate.not = Object.keys(predicate).reduce(function (acc, fnName) {
  acc[fnName] = utils.complement(predicate[fnName]);
  return acc;
}, {});

},{"./utils":5}],5:[function(require,module,exports){
'use strict';
var predicate = module.exports;
var _slice = Array.prototype.slice;

// Useful for debuging curried functions
function setSrc(curried, src) {
  curried.toString = function() {
    return src.toString();
  };
  curried.src = src;
  return curried;
}

// Curry's fn's with arity 2
var curry = predicate.curry = function(f) {
  return setSrc(function curried(a, b) {
    switch (arguments.length) {
      case 0: throw new TypeError('Function called with no arguments');
      case 1:
        return setSrc(function curried(b) {
          return f(a, b);
        }, f);
    }

    return f(a, b);
  }, f);
};

predicate.partial = function (fn) {
  var args = _slice.call(arguments, 1);
  return function() {
    return fn.apply(null, args.concat(_slice.call(arguments)));
  };
};

predicate.complement = predicate.invert = function (pred) {
  return function () {
    var ret = pred.apply(null, arguments);
    // Handle curried fns
    if (typeof ret === 'function') return predicate.complement(ret);
    return !ret;
  };
};

predicate.mod = curry(function (a, b) {
  return a % b;
});

// assign b's props to a
predicate.assign = curry(function(a, b) {
  // use crummy for/in for perf purposes
  for (var prop in b) {
    if (b.hasOwnProperty(prop)) {
      a[prop] = b[prop];
    }
  }

  return a;
});


},{}]},{},[1])(1)
});