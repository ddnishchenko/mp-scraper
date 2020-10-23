/*
setTimeout(function() {
    const queryParams = new URLSearchParams(location.search);
    console.log(queryParams.get('model'))
    window.dispatchEvent(new CustomEvent('model-downloaded', { model: queryParams.get('model') }));
    window.modelDownloaded = true;
}, 3000);

window.addEventListener('model-downloaded', function(e) {
    console.log(e);
})
*/

Promise.delay = (delay) => new Promise((resolve, reject) => setTimeout(resolve, delay));
const config = {
    limit: 10,
    delay: 2000
}

const iframe = document.getElementById('showcase_iframe');
const matterportModelForm = document.getElementById('matterport_model');
const matterportModelFormInput = document.getElementById('materport_model_name');
const btnAll = document.getElementById('downloadAll');
const dimensions = { width: 8192, height: 4096 };
const options = { mattertags: false, sweeps: true};
let model = {};
let sweeps = [];
const queryParams = new URLSearchParams(location.search);
const initLimit = config.limit; //+queryParams.get('limit');
let panoCounter = 0;


var modelStore;


/**
 * Flow for downloading all panoramas from Matterport model
 * 1. sdk.Sweep.moveTo(sweepId, sweepCoordinates) - move to particular position in the model
 * 2. App waits till moving to position is finished
 * 3. sdk.Renderer.takeEquirectangular(dimensions,options) - download Panorama what respects current position in the model
 * 4. wait response from step 3
 * 5. response from step 3 which is base64 jpeg image, put into href property of A html element with property download
 * 6. Repeat the flow for the next following sweeps(positions in model)
 */


function DataStore(prefix) {
    this.set = function(key, data) {
        localStorage.setItem(prefix + '.' + key, JSON.stringify(data));
    }
    this.get = function(key) {
        return JSON.parse( localStorage.getItem(prefix + '.' + key) );
    }
    this.delete = function(key) {
        localStorage.removeItem(prefix + '.' + key);
    }
}


function loadedShowcaseHandler(sdk) {
    console.log('Matterport SDK:', sdk);
    
    
    var isDownloadAll = false;
    var sweepThrogh = function* () {
        var s = modelStore.get('sweeps');
        for (let index = 0; index < s.length; index++) {
            yield s[index];
        }
    };
    var removeYeileded = (yeildSweep) => {
        var s = modelStore.get('sweeps');
        var newSweeps = s.filter(sweep => sweep.uuid !== yeildSweep.uuid)
        modelStore.set('sweeps', newSweeps);
        console.log('remained sweeps', s.length);
    };

    var generator = sweepThrogh();
    var genMem;
    

    async function takePano(sweep) {
        const panoData = await sdk.Renderer.takeEquirectangular(dimensions,options);
        const data = {
            sweep: sweep,
            sid: model.sid,
            panorama: panoData
        };
        console.log('Save panorama...')
        const res = await fetch(location.origin + '/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(data)
        });
        
        return res.json();
    }

    async function moveToSweep() {
        genMem = generator.next();
        removeYeileded(genMem.value);
        if (!genMem.done) {
            await sdk.Sweep.moveTo(genMem.value.uuid, {
                transition: sdk.Sweep.Transition.INSTANT,
                transitionTime: 0,
            })
        } else {
            isDownloadAll = false;
            window.modelDownloaded = true;
        }
        
    }

    async function startScraping(init) {
        isDownloadAll = true;
        await moveToSweep();
    }

    async function takePanoAndMove(oldSweep, newSweep) {
        console.log(sdk.Sweep.Event.ENTER, 'old:', oldSweep, 'new:', newSweep);

        if (!oldSweep) {
            model = await sdk.Model.getData();
            sweeps = model.sweeps;
            modelStore = new DataStore(model.sid);

            console.log('Model:', model);            
            console.log('sweeps count:', sweeps.length);
            var storedSweeps = modelStore.get('sweeps');

            
            if (!storedSweeps) {
                modelStore.set('sweeps', sweeps);
                storedSweeps = modelStore.get('sweeps');
            }

            if (storedSweeps.length) {
                startScraping();
            } else {
                modelStore.delete('sweeps');
                isDownloadAll = false;
                window.modelDownloaded = true;
            }

        } else {
            if (isDownloadAll && !genMem.done) {
                // 2 - take pano
                await takePano(genMem.value);
                panoCounter++;
                console.log(panoCounter);
                if (panoCounter >= initLimit) {
                    const memorySweeps = modelStore.get('sweeps');
                    if (memorySweeps.length) {
                        location.reload();
                    } else {
                        modelStore.delete('sweeps');
                    }
                    return false;
                }
                await Promise.delay(config.delay);
                await moveToSweep();
            } else {
                window.modelDownloaded = true;
            }
        }
        
       
    }

    sdk.on(sdk.Sweep.Event.ENTER, takePanoAndMove);

    btnAll.addEventListener('click', startScraping);

}

function handleError(e) {
    console.log(e);
}

async function showcaseLoader() {
    try {
        
        await window.MP_SDK.connect(
            iframe, // Obtained earlier
            '6cd09c1a40924b36b0afe58b84b05d51', // Your API key
            '3.2' // SDK version you are using
            // Use the latest version you can for your app
        )
        .then(loadedShowcaseHandler);
    } catch (e) {
        console.error(e);
    }
};
iframe.addEventListener('load', showcaseLoader, true);

matterportModelForm.addEventListener('submit', function(event) {
    iframe.src = matterportModelFormInput.value;
})
