// Copyright 2014 Todd Fleming
//
// This file is part of jscut.
//
// jscut is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// jscut is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with jscut.  If not, see <http://www.gnu.org/licenses/>.

var options = {
    'profile': false,
};

function MiscViewModel() {
    var self = this;
    self.saveSettingsFilename = ko.observable("settings.jscut");
    self.saveSettingsContent = ko.observable("");
    self.saveSettingsUrl = ko.observable(null);
    self.launchChiliUrl = ko.observable(null);
}

var mainSvg = Snap("#MainSvg");
var materialSvg = Snap("#MaterialSvg");
var contentGroup = mainSvg.group();
contentGroup.attr("filter", mainSvg.filter(Snap.filter.contrast(.5)).attr("filterUnits", "objectBoundingBox"));
var combinedGeometryGroup = mainSvg.g();
var toolPathsGroup = mainSvg.g();
var selectionGroup = mainSvg.g();
var renderPath;

var svgViewModel;
var materialViewModel;
var selectionViewModel;
var toolModel;
var operationsViewModel;
var gcodeConversionViewModel;
var miscViewModel;

svgViewModel = new SvgViewModel();
materialViewModel = new MaterialViewModel();
selectionViewModel = new SelectionViewModel(svgViewModel, materialViewModel, selectionGroup);
toolModel = new ToolModel();
operationsViewModel = new OperationsViewModel(
    options, svgViewModel, materialViewModel, selectionViewModel, toolModel, combinedGeometryGroup, toolPathsGroup,
    function () { gcodeConversionViewModel.generateGcode(); });
gcodeConversionViewModel = new GcodeConversionViewModel(options, materialViewModel, toolModel, operationsViewModel);
miscViewModel = new MiscViewModel();

ko.applyBindings(materialViewModel, $("#Material")[0]);
ko.applyBindings(selectionViewModel, $("#CurveToLine")[0]);
ko.applyBindings(toolModel, $("#Tool")[0]);
ko.applyBindings(operationsViewModel, $("#Operations")[0]);
ko.applyBindings(operationsViewModel, $("#Operation")[0]);
ko.applyBindings(gcodeConversionViewModel, $("#GcodeConversion")[0]);
ko.applyBindings(gcodeConversionViewModel, $("#FileGetGcode1")[0]);
ko.applyBindings(gcodeConversionViewModel, $("#FileGetGcode2")[0]);
ko.applyBindings(gcodeConversionViewModel, $("#simulatePanel")[0]);
ko.applyBindings(miscViewModel, $("#SaveSettings1")[0]);
ko.applyBindings(miscViewModel, $("#SaveSettings2")[0]);
ko.applyBindings(miscViewModel, $("#LaunchChiliPeppr")[0]);

function updateSvgAutoHeight() {
    $("svg.autoheight").each(function () {
        internalWidth = $(this).attr("internalWidth");
        internalHeight = $(this).attr("internalHeight");
        $(this).height($(this).width() * internalHeight / internalWidth);
    });
}

$(function () {
    updateSvgAutoHeight();
    $(window).resize(updateSvgAutoHeight);
});

function updateSvgSize() {
    bbox = mainSvg.getBBox();
    $("#MainSvg").attr({
        width: $("#MainSvgDiv").width(),
        height: Math.max(10, $(window).height() - 120),
        preserveAspectRatio: 'xMinYMin meet',
    });
    // attr() messes viewBox up
    $("#MainSvg").get(0).setAttribute("viewBox", (bbox.x - 2) + " " + (bbox.y - 2) + " " + (bbox.w + 4) + " " + (bbox.h + 4));
}

$(function () {
    updateSvgSize();
    $(window).resize(updateSvgSize);
});

function updateRenderPathSize() {
    $("#renderPathCanvas").attr({
        width: $("#MainSvgDiv").width(),
        height: $("#MainSvgDiv").width(),
    });
}

$(function () {
    updateRenderPathSize();
    $(window).resize(updateRenderPathSize);
    renderPath = startRenderPath(options, $("#renderPathCanvas")[0], function () { });
});

var nextAlertNum = 1;
function showAlert(message, alerttype, haveTimeout) {
    haveTimeout = (typeof haveTimeout === "undefined") ? true : false;
    var alertNum = nextAlertNum++;
    $('#alert_placeholder').prepend('<div id="AlertNum' + alertNum + '" class="alert ' + alerttype + '"><a class="close" data-dismiss="alert">&times;</a>' + message + '</div>')
    var result = $("#AlertNum" + alertNum);
    if (haveTimeout)
        setTimeout(function () {
            result.remove();
        }, 5000);
    return result;
}

Snap.load("Material.svg", function (f) {
    materialSvg.append(f);
    materialViewModel.materialSvg(materialSvg);
});

var tutorialAlert = null;
var nextTutorialStep = 0;
function tutorial(step, message) {
    if (step >= nextTutorialStep) {
        if (tutorialAlert != null)
            tutorialAlert.remove();
        tutorialAlert = showAlert("Step " + step + ": " + message, "alert-info", false);
        nextTutorialStep = step + 1;
    }
}

tutorial(1, 'Open an SVG file.');

function loadSvg(alert, filename, content) {
    svg = Snap.parse(content);
    contentGroup.append(svg);
    updateSvgSize();
    if(alert)
        alert.remove();
    showAlert("loaded " + filename, "alert-success");
    tutorial(2, 'Click 1 or more objects.');
}

$(document).on('change', '#choose-svg-file', function (event) {
    var files = event.target.files;
    for (var i = 0, file; file = files[i]; ++i) {
        (function (file) {
            var alert = showAlert("loading " + file.name, "alert-info", false);
            var reader = new FileReader();
            reader.onload = function (e) {
                loadSvg(alert, file.name, e.target.result);
            };
            reader.onabort = function (e) {
                alert.remove();
                showAlert("aborted reading " + file.name, "alert-danger");
            };
            reader.onerror = function (e) {
                alert.remove();
                showAlert("error reading " + file.name, "alert-danger");
            };
            reader.readAsText(file);
        })(file);
    }
    $(event.target).replaceWith(control = $(event.target).clone(true));
});

function openSvgDropbox() {
    Dropbox.choose({
        success: function (files) {
            var alert = showAlert("loading " + files[0].name, "alert-info", false);
            $.get(files[0].link, function (content) {
                loadSvg(alert, files[0].name, content);
            }, "text").fail(function () {
                alert.remove();
                showAlert("load " + files[0].name + " failed", "alert-danger");
            });
        },
        linkType: "direct",
    });
}

$("#MainSvg").click(function (e) {
    var element = Snap.getElementByPoint(e.pageX, e.pageY);
    if (element != null) {
        operationsViewModel.clickOnSvg(element) ||
        selectionViewModel.clickOnSvg(element);
        if (selectionViewModel.selNumSelected() > 0) {
            tutorial(3, 'Click "Create Operation" after you have finished selecting objects.');
        }
    }
});

function makeAllSameUnit(val) {
    "use strict";
    materialViewModel.matUnits(val);
    toolModel.units(val);
    gcodeConversionViewModel.units(val);

    var ops = operationsViewModel.operations();
    for (var i = 0; i < ops.length; ++i)
        ops[i].units(val);
}

$('#pxPerInch').popover({
    trigger: "hover",
    html: true,
    content: "<table><tr><td>Inkscape:<td>90<tr><td>Adobe Illustrator:<td>72<tr><td>CorelDRAW:<td>96</table>",
    container: "body",
    placement: "right"
});

$('#createOperationButton').popover({
    trigger: "manual",
    html: true,
    content: "<p class='bg-danger'>Select 1 or more objects in the \"Edit Toolpaths\" tab before clicking here</p>",
    container: "body",
    placement: "right"
});

$('#createOperationButton').parent().hover(
    function () {
        if ($('#createOperationButton').attr("disabled"))
            $('#createOperationButton').popover('show');
    },
    function () { $('#createOperationButton').popover('hide'); });

function toJson() {
    return {
        'svg': svgViewModel.toJson(),
        'material': materialViewModel.toJson(),
        'curveToLineConversion': selectionViewModel.toJson(),
        'tool': toolModel.toJson(),
        'operations': operationsViewModel.toJson(),
        'gcodeConversion': gcodeConversionViewModel.toJson(),
    };
}

function fromJson(json) {
    if (json) {
        svgViewModel.fromJson(json.svg);
        materialViewModel.fromJson(json.material);
        selectionViewModel.fromJson(json.curveToLineConversion);
        toolModel.fromJson(json.tool);
        operationsViewModel.fromJson(json.operations);
        gcodeConversionViewModel.fromJson(json.gcodeConversion);
        updateSvgSize();
    }
}

function showSaveSettingsModal() {
    "use strict";
    miscViewModel.saveSettingsContent(JSON.stringify(toJson()));

    if (miscViewModel.saveSettingsUrl() != null)
        URL.revokeObjectURL(miscViewModel.saveSettingsUrl());
    miscViewModel.saveSettingsUrl(URL.createObjectURL(new Blob([miscViewModel.saveSettingsContent()])));

    $('#save-settings-modal').modal('show');
}

$(document).on('change', '#choose-settings-file', function (event) {
    var files = event.target.files;
    for (var i = 0, file; file = files[i]; ++i) {
        (function (file) {
            var alert = showAlert("loading " + file.name, "alert-info", false);
            var reader = new FileReader();
            reader.onload = function (e) {
                fromJson(JSON.parse(e.target.result));
                alert.remove();
                showAlert("loaded " + file.name, "alert-success");
            };
            reader.onabort = function (e) {
                alert.remove();
                showAlert("aborted reading " + file.name, "alert-danger");
            };
            reader.onerror = function (e) {
                alert.remove();
                showAlert("error reading " + file.name, "alert-danger");
            };
            reader.readAsText(file);
        })(file);
    }
    $(event.target).replaceWith(control = $(event.target).clone(true));
});

var googleDeveloperKey = 'AIzaSyABOorNywzgSXQ8Waffle8zAhfgkHUBw0M';
var googleClientId = '103921723157-leb9b5b4i79euhnn96nlpeeev1m3pvg0.apps.googleusercontent.com';
var googleAuthApiLoaded = false;
var googlePickerApiLoaded = false;
var googleDriveApiLoaded = false;

function onGoogleApiLoad() {
    gapi.load('auth', function () { googleAuthApiLoaded = true; });
    gapi.load('picker', function () { googlePickerApiLoaded = true; });
}

function onGoogleClientLoad() {
    gapi.client.load('drive', 'v2', function () { googleDriveApiLoaded = true; });
}

var googleDriveReadToken;
function googleDriveAuthRead(callback) {
    if (!googleAuthApiLoaded)
        return;
    else if (googleDriveReadToken)
        callback();
    else
        window.gapi.auth.authorize({
            'client_id': googleClientId,
            'scope': ['https://www.googleapis.com/auth/drive.readonly'],
            'immediate': false
        }, function (authResult) {
            if (authResult && !authResult.error) {
                googleDriveReadToken = authResult.access_token;
                callback();
            }
        });
}

var googleDriveWriteToken;
function googleDriveAuthWrite(callback) {
    if (!googleAuthApiLoaded)
        return;
    else if (googleDriveWriteToken)
        callback();
    else
        window.gapi.auth.authorize({
            'client_id': googleClientId,
            'scope': ['https://www.googleapis.com/auth/drive'],
            'immediate': false
        }, function (authResult) {
            if (authResult && !authResult.error) {
                googleDriveWriteToken = authResult.access_token;
                callback();
            }
        });
}

function openGoogle(picker, wildcard, callback) {
    googleDriveAuthRead(function () {
        if (googlePickerApiLoaded && googleDriveApiLoaded) {
            if (!picker.picker) {
                picker.picker = new google.picker.PickerBuilder();
                picker.picker.addView(
                    new google.picker.DocsView(google.picker.ViewId.DOCS).
                        setQuery(wildcard));
                picker.picker.enableFeature(google.picker.Feature.NAV_HIDDEN);
                picker.picker.setOAuthToken(googleDriveReadToken);
                picker.picker.setDeveloperKey(googleDeveloperKey);
                picker.picker.setCallback(function (data) {
                    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                        var doc = data[google.picker.Response.DOCUMENTS][0];
                        var name = doc[google.picker.Document.NAME];
                        var id = doc[google.picker.Document.ID];

                        var alert = showAlert("loading " + name, "alert-info", false);
                        gapi.client.drive.files.get({
                            'fileId': id
                        }).execute(function (resp) {
                            if (resp.error) {
                                alert.remove();
                                showAlert(resp.error.message, "alert-danger");
                            } else {
                                var xhr = new XMLHttpRequest();
                                xhr.open('GET', resp.downloadUrl);
                                xhr.setRequestHeader('Authorization', 'Bearer ' + googleDriveReadToken);
                                xhr.onload = function (content) {
                                    if (this.status == 200)
                                        callback(alert, name, this.responseText);
                                    else {
                                        alert.remove();
                                        showAlert(this.statusText, "alert-danger");
                                    }
                                };
                                xhr.onerror = function () {
                                    alert.remove();
                                    showAlert("load " + name + " failed", "alert-danger");
                                };
                                xhr.overrideMimeType('text');
                                xhr.send();
                            }
                        });
                    }
                });
                picker.picker = picker.picker.build();
            }
            picker.picker.setVisible(true);
        }
    });
} // openGoogle()

function saveGoogle(filename, content, callback) {
    googleDriveAuthWrite(function () {
        if (googlePickerApiLoaded && googleDriveApiLoaded && googleDriveWriteToken) {
            const boundary = '-------53987238478475486734879872344353478123';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            var contentType = 'text/plain';
            var metadata = {
                'title': filename,
                'mimeType': contentType
            };

            var multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + contentType + '\r\n' +
                '\r\n' +
                content +
                close_delim;

            var request = gapi.client.request({
                'path': '/upload/drive/v2/files',
                'method': 'POST',
                'params': { 'uploadType': 'multipart' },
                'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                },
                'body': multipartRequestBody
            });

            var alert = showAlert("saving " + filename, "alert-info", false);
            request.execute(function (result) {
                if (result.error) {
                    alert.remove();
                    showAlert(result.error.message, "alert-danger");
                } else {
                    alert.remove();
                    showAlert("saved " + filename, "alert-success");
                    callback();
                }
            });
        }
    });
} // saveGoogle()

var googleOpenSvgPicker = {};
function openSvgGoogle() {
    openGoogle(googleOpenSvgPicker, '*.svg', loadSvg);
}

function saveGcodeGoogle(callback) {
    if (gcodeConversionViewModel.gcode() == "") {
        showAlert('Click "Generate Gcode" first', "alert-danger");
        return;
    }
    saveGoogle(gcodeConversionViewModel.gcodeFilename(), gcodeConversionViewModel.gcode(), callback);
}

var googleOpenSettingsPicker = {};
function loadSettingsGoogle() {
    openGoogle(googleOpenSettingsPicker, '*.jscut', function (alert, filename, content) {
        fromJson(JSON.parse(content));
        alert.remove();
        showAlert("loaded " +filename, "alert-success");
});
}

function saveSettingsGoogle(callback) {
    saveGoogle(miscViewModel.saveSettingsFilename(), miscViewModel.saveSettingsContent(), callback);
}

function loadGist(gist) {
    var url = 'https://api.github.com/gists/' + gist;
    var alert = showAlert("loading " + url, "alert-info", false);
    $.get(url, function (content) {
        var jscutFiles = [], svgFiles = [], otherFiles = [];
        alert.remove();
        for (var filename in content.files) {
            if (filename.indexOf('.jscut', filename.length - 6) !== -1)
                jscutFiles.push(filename);
            else if (filename.indexOf('.svg', filename.length - 4) !== -1)
                svgFiles.push(filename);
            else
                otherFiles.push(filename);
        }

        if (jscutFiles.length == 0) {
            if (svgFiles.length > 0)
                showAlert("No .jscut files found in gist", "alert-info");
            else if (otherFiles.length == 0)
                showAlert("No files found in gist", "alert-danger");
            else if (otherFiles.length == 1)
                jscutFiles = otherFiles;
            else
                showAlert("No .jscut files or .svg files found in gist", "alert-danger");
        } else if (jscutFiles.length > 1)
            showAlert("Multiple .jscut files found; ignoring them", "alert-danger");

        for (var i = 0; i < svgFiles.length; ++i)
            loadSvg(null, svgFiles[i], content.files[svgFiles[i]].content);

        if (jscutFiles.length == 1) {
            try {
                fromJson(JSON.parse(content.files[jscutFiles[0]].content));
                showAlert("loaded " +jscutFiles[0], "alert-success");
                operationsViewModel.tutorialGenerateToolpath();
            } catch (e) {
                showAlert(e.message, "alert-danger");
            }
        }
    }, "json").fail(function (e) {
        alert.remove();
        showAlert("load " + url + " failed", "alert-danger");
    });
}

var searchArgs = window.location.search.substr(1).split('&');
for (var i = 0; i < searchArgs.length; ++i) {
    var arg = searchArgs[0];
    if (arg.substr(0, 5) == 'gist=')
        loadGist(arg.substr(5));
}

function chiliGetUser(callback) {
    "use strict";
    $.getJSON("http://www.chilipeppr.com/datalogin?callback=?")
    .done(function (content) {
        if (typeof content.CurrentUser === "undefined")
            showAlert("Can't get current user from http://chilipeppr.com/", "alert-danger");
        else if (content.CurrentUser == null)
            showAlert("Not logged into http://chilipeppr.com/", "alert-danger");
        else if (typeof content.CurrentUser.ID === "undefined")
            showAlert("Can't get current user from http://chilipeppr.com/", "alert-danger");
        else
            callback(content.CurrentUser.ID);
    })
    .fail(function (e) {
        showAlert("Can't get current user from http://chilipeppr.com/", "alert-danger");
    });
}

function chiliSaveGcode() {
    var key = 'org-jscut-gcode-' + gcodeConversionViewModel.gcodeFilename();
    chiliGetUser(function (userId) {
        var alert = showAlert("Sending gcode to chilipeppr.com", "alert-info", false);
        $.ajax({
            url: "http://www.chilipeppr.com/dataput",
            type: "POST",
            crossDomain: true,
            xhrFields: {
                withCredentials: true
            },
            data: { key: key, val: gcodeConversionViewModel.gcode() },
            dataType: "json",
        })
        .done(function (content) {
            alert.remove();
            if(content.Error)
                showAlert(content.msg);
            else if (typeof content.Value !== "undefined") {
                miscViewModel.launchChiliUrl('http://chilipeppr.com/tinyg?loadJscut=' + encodeURIComponent(key));
                $('#save-gcode-modal').modal('hide');
                $('#launch-chilipeppr-modal').modal('show');
            }
            else
                showAlert("Can't save gcode to http://chilipeppr.com/", "alert-danger");
        })
        .fail(function (e) {
            alert.remove();
            showAlert("Can't save gcode to http://chilipeppr.com/", "alert-danger");
        });
    });
}

function grblWebSaveGcode() {
    var alert = showAlert("Sending gcode to GRBLweb", "alert-info", false);
    $.ajax({
        url: "/api/uploadGcode",
        type: "POST",
        data: { val: gcodeConversionViewModel.gcode() },
        dataType: "json",
    })
    .done(function (content) {
        alert.remove();
    })
    .fail(function (e) {
        alert.remove();
        showAlert("Can't save gcode to GRBLweb", "alert-danger");
    });
}
