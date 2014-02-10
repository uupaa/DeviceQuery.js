new Test().add([
        testDevice,
        testDeviceQueryCPU,
        testDeviceQueryGPU,
        testDeviceQueryDEVICE,
        testDeviceQueryOSVERSION,
        testDeviceQueryDISPLAY,
        testDeviceQueryCaseSensitive,
        testDeviceQuerySOCAndDeviceID,
        testDeviceQueryDeviceID,
    ]).run().worker(function(err, test) {
        if (!err) {
            var undo = Test.swap(DeviceQuery, DeviceQuery_);

            new Test(test).run(function(err, test) {
                undo = Test.undo(undo);
            });
        }
    });

function testDevice(next) {
    var spec = Device( Spec() );

    console.log("testDevice ok: " + spec.DEVICE.ID);
    next && next.pass();
}

function testDeviceQueryCPU(next) {
    var queryString = "CPU.TYPE = ARM; CPU.CLOCK >= 2.2";
    var id = DeviceQuery(queryString);

    if ( id.indexOf("MSM8974") >= 0 ) {
        console.log("testDeviceQueryCPU ok. query: " + queryString + ", result: " + id.join(","));
        next && next.pass();
    } else {
        console.error("testDeviceQueryCPU ng. query: " + queryString + ", result: " + id.join(","));
        next && next.miss();
    }
}

function testDeviceQueryGPU(next) {
    var queryString = "GPU.TYPE=Adreno; GPU.ID=320";
    var id = DeviceQuery(queryString);

    if ( id.indexOf("APQ8064T") >= 0 &&
         id.indexOf("APQ8064")  >= 0 ) {
        console.log("testDeviceQueryGPU ok. query: " + queryString + ", result: " + id.join(","));
        next && next.pass();
    } else {
        console.error("testDeviceQueryGPU ng. query: " + queryString + ", result: " + id.join(","));
        next && next.miss();
    }
}

function testDeviceQueryDEVICE(next) {
    var queryString = "DEVICE.BRAND=Google; DEVICE.SOC=MSM8974";
    var id = DeviceQuery(queryString);

    if ( id.indexOf("Nexus 5") >= 0 ) {
        console.log("testDeviceQueryDEVICE ok. query: " + queryString + ", result: " + id.join(","));
        next && next.pass();
    } else {
        console.error("testDeviceQueryDEVICE ng. query: " + queryString + ", result: " + id.join(","));
        next && next.miss();
    }
}

function testDeviceQueryOSVERSION(next) {
    var queryString = "OS.TYPE = android; OS.VERSION.PRE >= 2.3 ; OS.VERSION.HIGHEST < 4.1";
    var id = DeviceQuery(queryString);

    if ( id.length ) {
        console.log("testDeviceQueryOSVERSION ok. query: " + queryString + ", result: " + id.join(","));
        next && next.pass();
    } else {
        console.error("testDeviceQueryOSVERSION ng. query: " + queryString + ", result: " + id.join(","));
        next && next.miss();
    }
}

function testDeviceQueryDISPLAY(next) {
    var queryString = "OS.TYPE = ios; DEVICE.SOC = A5X ; DISPLAY.LONG > 1920";
    var id = DeviceQuery(queryString);

    if ( id.join(",") === "iPad 3" ) {
        console.log("testDeviceQueryDISPLAY ok. query: " + queryString + ", result: " + id.join(","));
        next && next.pass();
    } else {
        console.error("testDeviceQueryDISPLAY ng. query: " + queryString + ", result: " + id.join(","));
        next && next.miss();
    }
}

function testDeviceQueryCaseSensitive(next) {
    var id1 = DeviceQuery("OS.TYPE = android", true);  // case-sensitive
    var id2 = DeviceQuery("OS.TYPE = Android", false); // ignore-case

    if ( id1.length === 0 &&
         id2.length >= 0 ) {
        console.log("testDeviceQueryCaseSensitive ok.");
        next && next.pass();
    } else {
        console.error("testDeviceQueryCaseSensitive ng.");
        next && next.miss();
    }
}

function testDeviceQuerySOCAndDeviceID(next) {
    var soc = DeviceQuery("DEVICE.SOC=SHL24");

    if ( soc.length ) {
        console.log("testDeviceQuerySOCAndDeviceID ok.");
        next && next.pass();
    } else {
        console.error("testDeviceQuerySOCAndDeviceID ng.");
        next && next.miss();
    }
}

function testDeviceQueryDeviceID(next) {
    var id = DeviceQuery("OS.TYPE=SHL24;OS.VERSION.PRE>=SHL24;DEVICE.SOC=SHL24;DEVICE.BRAND=SHL24");
    // id: ["SH-01F", "SH-01FDQ", "SH-02F", "SHT22", "SHL24", "SHL23", "DM016SH", "SBM302SH"]

    if ( id.indexOf("SH-01F")   >= 0 &&
         id.indexOf("SH-01FDQ") >= 0 &&
         id.indexOf("SH-02F")   >= 0 &&
         id.indexOf("SHT22")    >= 0 &&
         id.indexOf("SHL24")    >= 0 &&
         id.indexOf("SHL23")    >= 0 &&
         id.indexOf("DM016SH")  >= 0 &&
         id.indexOf("SBM302SH") >= 0) {
        console.log("testDeviceQueryDeviceID ok.");
        next && next.pass();
    } else {
        console.error("testDeviceQueryDeviceID ng.");
        next && next.miss();
    }
}

