// @name: DeviceQuery.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;

// --- define ----------------------------------------------
var Device         = global["Device"] || require("uupaa.device.js");
var SOC_CATALOG    = Device["catalog"](true);
var DEVICE_CATALOG = Device["catalog"]();
var SOC_DATA       = 1;
var DEVICE_DATA    = 2;
var QUERY_MAP = {
        "CPU.TYPE":             [SOC_DATA,     0],
        "CPU.CLOCK":            [SOC_DATA,     1],
        "CPU.CORES":            [SOC_DATA,     2],
        "GPU.TYPE":             [SOC_DATA,     3],
        "GPU.ID":               [SOC_DATA,     4],
        "OS.TYPE":              [DEVICE_DATA,  0],
        "DEVICE.BRAND":         [DEVICE_DATA,  1],
        "DEVICE.SOC":           [DEVICE_DATA,  2],
        "OS.VERSION.PRE":       [DEVICE_DATA,  3, function(v) { return _parseVersionNumber(v).valueOf(); }],
        "OS.VERSION.HIGHEST":   [DEVICE_DATA,  4, function(v) { return _parseVersionNumber(v).valueOf(); }],
        "DISPLAY.SHORT":        [DEVICE_DATA,  5],
        "DISPLAY.LONG":         [DEVICE_DATA,  6],
        "DISPLAY.PPI":          [DEVICE_DATA,  7],
        "DISPLAY.DPR":          [DEVICE_DATA,  8],
        "MEMORY.RAM":           [DEVICE_DATA,  9],
        "INPUT.TOUCHES":        [DEVICE_DATA,  10]
    };

// --- interface -------------------------------------------
function DeviceQuery(selector,        // @arg DeviceQueryString: query string. "GPU.TYPE=Adreno;GPU.ID=330"
                     caseSensitive) { // @arg Boolean(= false): true is case-sensitive, false is ignore case.
                                      // @ret IDArray: [id, ...]
                                      // @help: DeviceQuery
                                      // @desc: Query device catlog.
//{@assert
    _if(!_isString(selector), "invalid DeviceQuery(selector): " + selector);
    if (caseSensitive !== undefined) {
        _if(!_isBoolean(caseSensitive), "invalid DeviceQuery(, caseSensitive)");
    }
//}@assert

    return _filter( _processing( _parse(selector) ), caseSensitive || false );
}

DeviceQuery["name"]       = "DeviceQuery";
DeviceQuery["repository"] = "https://github.com/uupaa/DeviceQuery.js";

// --- implement -------------------------------------------
function _parse(selector, caseSensitive) {
    var query = selector.replace(/[; ]*$/, "").trim().split(/\s*;\s*/); // ["DEVICE.SOC=MSM8974", ...]
    var parts = query.reduce(function(result, token) {
            if (token) {
                var keyValue = token.split(/\s*(==|=|<=|>=|<|>)\s*/); // ["DEVICE.SOC", "=", "MSM8974"]
                var keyword  = keyValue[0].toUpperCase();
                var operator = keyValue[1] || "";
                var value    = keyValue[2] || "";

                if ( keyword in QUERY_MAP ) {
                    result.push([keyword, operator, value]); // result: [ ["DEVICE.SOC", "=", "MSM8974"], ... ]
                } else {
                    console.log("DeviceQuery invalid token: " + token);
                }
            }
            return result;
        }, []);

    return parts;
}

function _processing(parts) {
    var parts = parts.reduce(function(result, queryArray) {
        var keyword  = queryArray[0];
        var operator = queryArray[1];
        var value    = queryArray[2];

        // DeviceQuery("DEVICE.SOC=" + Device("SHL24")) -> DeviceQuery("DEVICE.SOC=SHL24")
        if ( Device["has"](value) ) {
            value = keyword.split(".").reduce(function(spec, key) {
                return spec[key];
            }, Device(value));
            if (value.constructor === ({}).constructor) { // OS.VERSION.PRE, OS.VERSION.HIGHEST
                value = value.valueOf();
            }
        }
        result.push([keyword, operator, value]);
        return result;
    }, []);

    return parts;
}

function _filter(parts, caseSensitive) {
    var lastData = 0; // 0 or DEVICE_DATA or SOC_DATA

    // --- query phase ---
    var result = parts.reduce(function(prev, queryArray, index) { // "GPU.TYPE=Adreno"
        var keyword  = queryArray[0]; // "GPU.TYPE"
        var operator = queryArray[1]; // "="
        var value    = queryArray[2]; // "Adreno"

        if ( lastData === SOC_DATA && QUERY_MAP[keyword][0] === DEVICE_CATALOG) {
            // convert SoCID list to DeviceID list
            //      query( SOC_DATA -> DEVICE_DATA )
            prev = _convertSoCIDToDeviceID(prev)
        } else if ( lastData === DEVICE_DATA && QUERY_MAP[keyword][0] === SOC_DATA) {
            // convert DeviceID list to SoCID list
            //      query( DEVICE_DATA -> SOC_DATA )
            prev = _convertDeviceIDToSoCID(prev)
        }
        lastData = QUERY_MAP[keyword][0];

        var rv = _find( QUERY_MAP[keyword], operator, value, caseSensitive );

        return index ? _and(prev, rv)
                     : rv;
    }, []);

    return result;
}

function _convertSoCIDToDeviceID(socList) {
    return socList.reduce(function(prev, socID) {
        for (var deviceID in DEVICE_CATALOG) {
            if (DEVICE_CATALOG[deviceID][2] === socID) {
                prev.push(deviceID);
            }
        }
        return prev;
    }, []);
}

function _convertDeviceIDToSoCID(deviceList) {
    return deviceList.reduce(function(prev, deviceID) {
        var deviceSoC = DEVICE_CATALOG[deviceID][2];

        for (var socID in SOC_CATALOG) {
            if (socID === deviceSoC) {
                prev.push(socID);
            }
        }
        return prev;
    }, []);
}

function _find(map,             // @arg Array: [catalog, index, preprocess]
               operator,        // @arg String: operator. "=", "==", ">=", "<=", "<", ">"
               value,           // @arg String: query value.
               caseSensitive) { // @arg Boolean(= false): true is case-sensitive, false is ignore case.
                                // @ret Array: matched id. [id, ...]
    var rv = [];
    var catalog    = map[0] === SOC_DATA ? SOC_CATALOG
                                         : DEVICE_CATALOG;
    var index      = map[1];
    var preprocess = map[2] || null;

    if (!caseSensitive) {
        value = (value + "").toLowerCase();
    }
    for (var id in catalog) {
        var compare = catalog[id][index];

        if (preprocess) {
            compare = preprocess(compare);
        }
        if (!caseSensitive && typeof compare === "string") {
            compare = compare.toLowerCase();
        }
        if (compare) { // 0, 0.0, false, "" are skip
            switch (operator) {
            case "=":
            case "==": (compare == value) && rv.push(id); break;
            case "<=": (compare <= value) && rv.push(id); break;
            case ">=": (compare >= value) && rv.push(id); break;
            case "<":  (compare <  value) && rv.push(id); break;
            case ">":  (compare >  value) && rv.push(id);
            }
        }
    }
    return rv;
}

function _and(source,    // @arg Array: source array
              compare) { // @arg Array: compare array
                         // @ret Array:
                         // @desc: Array.and
    var rv = [], pos = 0;
    var copiedSource = source.concat();
    var compareValue = null, compareIndex = 0, compareLength = compare.length;

    for (; compareIndex < compareLength; ++compareIndex) { // loop compare
        if (compareIndex in compare) {
            compareValue = compare[compareIndex];

            pos = copiedSource.indexOf(compareValue);
            if (pos >= 0) { // copiedSource has compareValue
                rv.push(compareValue);
                copiedSource.splice(pos, 1);
            }
        }
    }
    return rv;
}

function _parseVersionNumber(version) { // @arg String: "MAJOR.MINOR.PATCH"
                                        // @ret DeviceVersionNumberObject: { MAJOR, MINOR, PATCH, valueOf }
                                        //          MAJOR - Integer: OS Major version.
                                        //          MINOR - Integer: OS Minor version.
                                        //          PATCH - Integer: OS Patch version.
                                        //          valueOf - Function:
    var ary = version.split(".");

    return { "valueOf": _versionValueOf, "MAJOR": +ary[0], "MINOR": +ary[1], "PATCH": +ary[2] };
}

function _versionValueOf() {
    return parseFloat(this["MAJOR"] + "." + this["MINOR"]);
}

//{@assert
function _isFunction(target) {
    return target !== undefined && (typeof target === "function");
}
function _isBoolean(target) {
    return target !== undefined && (typeof target === "boolean");
}
function _isString(target) {
    return target !== undefined && (typeof target === "string");
}
function _isNumber(target) {
    return target !== undefined && (typeof target === "number");
}
function _isObject(target) {
    return target && (target.constructor === ({}).constructor);
}
function _if(booleanValue, errorMessageString) {
    if (booleanValue) {
        throw new Error(errorMessageString);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = DeviceQuery;
}
//}@node
global["DeviceQuery"] ? (global["DeviceQuery_"] = DeviceQuery) // already exsists
                      : (global["DeviceQuery"]  = DeviceQuery);

})(this.self || global);

