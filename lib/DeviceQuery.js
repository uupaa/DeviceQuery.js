// @name: DeviceQuery.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;

// --- define ----------------------------------------------
var Device         = global["Device"] || require("uupaa.device.js");
var SOC_CATALOG    = Device["catalog"]("SOC");
var DEVICE_CATALOG = Device["catalog"]("DEVICE");
var QUERY_MAP = {
        "CPU.TYPE":             [SOC_CATALOG, 0],
        "CPU.CLOCK":            [SOC_CATALOG, 1],
        "CPU.CORES":            [SOC_CATALOG, 2],
        "GPU.TYPE":             [SOC_CATALOG, 3],
        "GPU.ID":               [SOC_CATALOG, 4],
        "OS.TYPE":              [DEVICE_CATALOG, 0],
        "DEVICE.BRAND":         [DEVICE_CATALOG, 1],
        "DEVICE.SOC":           [DEVICE_CATALOG, 2],
        "OS.VERSION.PRE":       [DEVICE_CATALOG, 3, function(v) { return _parseVersionNumber(v).valueOf() }],
        "OS.VERSION.HIGHEST":   [DEVICE_CATALOG, 4, function(v) { return _parseVersionNumber(v).valueOf() }],
        "DISPLAY.SHORT":        [DEVICE_CATALOG, 5],
        "DISPLAY.LONG":         [DEVICE_CATALOG, 6],
        "DISPLAY.PPI":          [DEVICE_CATALOG, 7],
        "DISPLAY.DPR":          [DEVICE_CATALOG, 8],
        "MEMORY.RAM":           [DEVICE_CATALOG, 9],
        "INPUT.TOUCHES":        [DEVICE_CATALOG, 10]
    };

// --- interface -------------------------------------------
function DeviceQuery(selector,        // @arg DeviceQueryString: query string. "GPU.TYPE=Adreno;GPU.ID=330"
                     caseSensitive) { // @arg Boolean(= false): true is case-sensitive, false is ignore case.
                                      // @ret IDArray: [id, ...]
                                      // @help: DeviceQuery
                                      // @desc: Query device catlog.
//{@assert
    _if(typeof selector !== "string", "invalid DeviceQuery(selector,): " + selector);
    if (caseSensitive !== undefined) {
        _if(typeof caseSensitive !== "boolean", "invalid DeviceQuery(, caseSensitive)");
    }
//}@assert

    return _deviceQuery(selector, caseSensitive || false);
}

DeviceQuery["name"]       = "DeviceQuery";
DeviceQuery["repository"] = "https://github.com/uupaa/DeviceQuery.js";

// --- implement -------------------------------------------
function _deviceQuery(selector, caseSensitive) {

    var lastQueryCatalog = null;

    var rv = selector.replace(/[; ]*$/, "").trim().split(/\s*;\s*/).reduce(function(prev, curt, index) { // "GPU.TYPE=Adreno"
        if (curt) {
            var token    = curt.split(/\s*(==|=|<=|>=|<|>)\s*/); // ["GPU.TYPE", "Adreno"]
            var keyword  = token[0].toUpperCase();
            var operator = token[1];
            var value    = token[2];

            // DeviceQuery("DEVICE.SOC=" + Device("SHL24")) -> DeviceQuery("DEVICE.SOC=SHL24")
            if (keyword === "DEVICE.SOC") {
                if (value in DEVICE_CATALOG) {
                    value = Device(value)["DEVICE"]["SOC"];
                }
            }

            if ( keyword in QUERY_MAP ) { // known keyword?
                if ( lastQueryCatalog === SOC_CATALOG && QUERY_MAP[keyword][0] === DEVICE_CATALOG) {
                    // convert SoCID list to DeviceID list
                    //      query( SOC_CATALOG -> DEVICE_CATALOG )
                    prev = _convertSoCIDToDeviceID(prev)
                } else if ( lastQueryCatalog === DEVICE_CATALOG && QUERY_MAP[keyword][0] === SOC_CATALOG) {
                    // convert DeviceID list to SoCID list
                    //      query( DEVICE_CATALOG -> SOC_CATALOG )
                    prev = _convertDeviceIDToSoCID(prev)
                }
                lastQueryCatalog = QUERY_MAP[keyword][0];

                var result = _find( QUERY_MAP[keyword], operator, value, caseSensitive );

                return index ? _and(prev, result)
                             : result;
            }
            return [];
        }
        return prev;
    }, []);
    return rv;
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
    var catalog    = map[0]; // DEVICE_CATALOG, SOC_CATALOG
    var index      = map[1];
    var preprocess = map[2] || null;

    if (!caseSensitive) {
        value = value.toLowerCase();
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

function _parseVersionNumber(version) { // @arg VersionInteger: 3 or 4 digits number. eg: 442, 3106
                                        // @ret DeviceVersionNumberObject: { MAJOR, MINOR, PATCH, valueOf }
                                        //          MAJOR - Integer: OS Major version.
                                        //          MINOR - Integer: OS Minor version.
                                        //          PATCH - Integer: OS Patch version.
                                        //          valueOf - Function:
    // parse os version number:
    //    987 -> { VERSION:  9.8, MAJOR:  9, MINOR: 8, PATCH: 7 }
    //   9876 -> { VERSION: 98.7, MAJOR: 98, MINOR: 7, PATCH: 6 }

    var digits = null, major = 0, minor = 0, patch = 0;

    if (version < 1000) {
        digits = (1000 + version).toString().slice(-3).slice(""); // 12 -> "012" -> ["0", "1", "2"]
        major  = +digits[0]; // "0" -> 0
        minor  = +digits[1]; // "1" -> 1
        patch  = +digits[2]; // "2" -> 2
    } else {
        digits = version.toString().slice(""); // 1234 -> ["1", "2", "3", "4"]
        major  = +(digits[0] + digits[1]);     // "12" -> 12
        minor  = +digits[2];                   // "3"  -> 3
        patch  = +digits[3];                   // "4"  -> 4
    }
    return { "valueOf": _versionValueOf, "MAJOR": major, "MINOR": minor, "PATCH": patch };
}

function _versionValueOf() {
    return parseFloat(this["MAJOR"] + "." + this["MINOR"]);
}

//{@assert
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

