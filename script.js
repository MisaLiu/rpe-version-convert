'use strict';

const qs = (e) => document.querySelector(e);
const doms = {
    fileInput: qs('input#file-select'),
    chartVersion: qs('span#chart-version'),
    targetVersion: qs('select#target-version'),
    minifyChart: qs('input#minify-chart'),
    saveBtn: qs('button#save')
};
const settings = {
    inputFile: null,
    inputFileName: null,
    targetVersion: null,
    minify: false
};

doms.fileInput.addEventListener('input', function ()
{
    if (this.files.length < 1 || !this.files[0]) return;

    let reader = new FileReader();

    reader.onerror = (e) =>
    {
        console.error(e);
        alert('Something went wrong, please try again or check console.');
        return;
    }

    reader.onloadend = () =>
    {
        try
        {
            settings.inputFile = JSON.parse(reader.result);

            if (!settings.inputFile.META || isNaN(settings.inputFile.META.RPEVersion))
            {
                throw new Error('This file is not a RPE chart!');
            }

            doms.chartVersion.innerText = settings.inputFile.META.RPEVersion;
            if (settings.inputFile.META.RPEVersion >= 113) doms.chartVersion.innerText += ' (v1.2 or newer)';
            else if (settings.inputFile.META.RPEVersion >= 105) doms.chartVersion.innerText += ' (v1.1)';
            else doms.chartVersion.innerText += ' (v1.0 or older)';

            doms.targetVersion.disabled = false;
            doms.targetVersion.selectedVersion = false;

            for (const option of doms.targetVersion.childNodes)
            {
                if (!(option instanceof HTMLOptionElement)) continue;

                if (option.value > settings.inputFile.META.RPEVersion) option.disabled = true;
                else option.disabled = false;

                if (!doms.targetVersion.selectedVersion && !option.disabled)
                {
                    option.selected = true;
                    settings.targetVersion = option.value;
                    doms.targetVersion.selectedVersion = true;
                }
                else option.selected = false;
            }

            settings.inputFileName = this.files[0].name;
            doms.saveBtn.disabled = false;
        }
        catch (e)
        {
            console.error(e);
            alert('This file is not a RPE chart!');
            return;
        }
    }

    reader.readAsText(this.files[0]);
});

doms.targetVersion.addEventListener('input', function ()
{
    settings.targetVersion = this.value;
});

doms.minifyChart.addEventListener('input', function ()
{
    settings.minify = this.checked;
});

doms.saveBtn.addEventListener('click', () =>
{
    if (!settings.inputFile) return;
    if (isNaN(settings.targetVersion)) return;

    if (settings.targetVersion > settings.inputFile.META.RPEVersion)
    {
        alert('Target version cannot be newer than chart version!');
        return;
    }

    let realName = '';
    let output = { ...settings.inputFile };

    // 113
    if (settings.targetVersion < output.META.RPEVersion)
    {
        // ?
        output.META.RPEVersion = 113;
    }

    // 105
    if (settings.targetVersion < output.META.RPEVersion)
    {
        for (const judgeline of output.judgeLineList)
        {
            delete judgeline.alphaControl;
            delete judgeline.posControl;
            delete judgeline.sizeControl;
            delete judgeline.skewControl;
            delete judgeline.yControl;
        }

        output.META.RPEVersion = 105;
    }

    // 100
    if (settings.targetVersion < output.META.RPEVersion)
    {
        for (const judgeline of output.judgeLineList)
        {
            delete judgeline.bpmfactor;
            delete judgeline.extended;
            delete judgeline.father;
            delete judgeline.zOrder;

            for (const eventLayer of judgeline.eventLayers)
            {
                for (const name in eventLayer)
                {
                    for (const event of eventLayer[name])
                    {
                        delete event.easingLeft;
                        delete event.easingRight;
                    }
                }
            }
        }

        output.META.RPEVersion = 100;
    }

    for (let index = 0, nameGroup = settings.inputFileName.split('.'); (index + 1) < nameGroup.length; index++)
    {
        realName += nameGroup[index];
        if ((index + 2) < nameGroup.length) realName += '.';
    }

    realName += '_v' + settings.targetVersion;
    realName += (settings.minify ? '_minified' : '');
    realName += '.json';

    {
        let dlLink = document.createElement('a');
        let file = new Blob([JSON.stringify(output, null, (settings.minify ? undefined : 4))], {
            type: 'application/json'
        });
        let objUrl = URL.createObjectURL(file);

        dlLink.href = objUrl;
        dlLink.download = realName;
        dlLink.style.display = 'none';

        dlLink.click();

        URL.revokeObjectURL(file);
    }
});