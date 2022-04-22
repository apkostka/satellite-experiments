const express = require('express');
const fs = require('fs/promises');

const main = async () => {
    const app = express();
    app.set('view engine', 'pug');
    app.use(express.static(__dirname + '/assets'));

    let tleData = await fs.readFile('./data/active_satellites.tle', 'utf8');
    tleData = tleData.split('\n');
    let satelliteData = [];

    for (let i = 0; i < tleData.length; i+=3) {
        if (tleData[i] && tleData[i+1] && tleData[i+2]) {
            satelliteData.push({
                name: tleData[i].trim(),
                tle: [tleData[i + 1].trim(), tleData[i + 2].trim()]
            });
        }
    }

    //satelliteData = satelliteData.slice(0, 100);

    app.get('/satellites', (req, res) => {
        res.send(`
            <html>
                <head>
                    <title>Satellite Tracker</title>
                    <script src="https://cesium.com/downloads/cesiumjs/releases/1.81/Build/Cesium/Cesium.js"></script>
                    <link href="https://cesium.com/downloads/cesiumjs/releases/1.81/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/satellite.js/4.0.0/satellite.js"></script>
                </head>
                <body>
                    <div id="cesiumContainer"></div>
                    <script type="text/javascript">
                        const satelliteData = ${JSON.stringify(satelliteData)};
                        console.log(satelliteData);
                        const viewer = new Cesium.Viewer('cesiumContainer', {
                            imageryProvider: new Cesium.TileMapServiceImageryProvider({
                                url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
                            }),
                            baseLayerPicker: false, geocoder: false, homeButton: false, infoBox: false,
                            navigationHelpButton: false, sceneModePicker: false
                        });
                        viewer.scene.globe.enableLighting = true;

                        const totalSeconds = 60 * 60 * 6;
                        const timestepInSeconds = 10;
                        const start = Cesium.JulianDate.fromDate(new Date());
                        const stop = Cesium.JulianDate.addSeconds(start, totalSeconds, new Cesium.JulianDate());
                        viewer.clock.startTime = start.clone();
                        viewer.clock.stopTime = stop.clone();
                        viewer.clock.currentTime = start.clone();
                        viewer.timeline.zoomTo(start, stop);
                        viewer.clock.multiplier = 40;
                        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
                        
                        for (const sat of satelliteData) {
                            const satrec = satellite.twoline2satrec(...sat.tle);
                            const positionsOverTime = new Cesium.SampledPositionProperty();
                            for (let i = 0; i < totalSeconds; i+= timestepInSeconds) {
                              const time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
                              const jsDate = Cesium.JulianDate.toDate(time);
                        
                              const positionAndVelocity = satellite.propagate(satrec, jsDate);
                              const gmst = satellite.gstime(jsDate);
                              const p   = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                        
                              const position = Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height * 1000);
                              positionsOverTime.addSample(time, position);
                            }

                            const satellitePoint = viewer.entities.add({
                                position: positionsOverTime,
                                point: { pixelSize: 5, color: Cesium.Color.RED },
                                name: sat.name,
                                //label: { text: sat.name, scale: 0.5  }
                            });
                        }
                          
                    </script>
                </body>
            </html>
        `);
    });

    app.listen(3000, () => {
        console.log('listening on 3000');
    })
}

main();
