var fs = require('fs');
var exec = require('child_process').exec;
var currentRecording = null;
var audioStream = null;

function init() {
  if (navigator.webkitGetUserMedia) {
    navigator.webkitGetUserMedia( {audio:true}, onSuccess, onFail);
  } else {
    alert('webRTC not available');
  }
}

var onSuccess = function(stream) {
	audioStream = stream;
	displayFrequency(audioStream);
	setUpButtonEvents();
};
var onFail = function() {
	console.log('fail: could not connect to stream');
};

var displayFrequency = function (stream) {
	// This context is for analyzing the mic input
	var context = new AudioContext();
	// The analyser is attached to the context and
	// provides an interface for its data
	var analyser = context.createAnalyser();
	// The source dictates where the audio context's
	// data is coming from
	var source = context.createMediaStreamSource(stream);
	source.connect(analyser);

	setInterval(function() {
		var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    var totalSound = 0;
    for (var i = 0; i < array.length; i++) {
    	totalSound += array[i];
    };
    //console.log(totalSound);
    var meter = document.getElementById('audioLevel');
    meter.value = totalSound / 50000;
	}, 100);
};

var startRecording = function(stream) {
	recordRTC = RecordRTC(stream);
	recordRTC.startRecording();
	currentRecording = recordRTC;
};

// Stop recording and save
var stopRecording = function() {
	var recordRTC = currentRecording;
	var filePath = './recordings/';
	filePath += (new Date).getTime().toString().substr(6,13) + '.wav';
	recordRTC.stopRecording(function(audioURL) {
		recordRTC.getDataURL(function(dataURL) {
			dataURL = dataURL.split(',').pop();
  		fileBuffer = new Buffer(dataURL, 'base64');
  		fs.writeFileSync(filePath, fileBuffer);			
		});
	});
};

// Mix the last two files that were recorded
var mixAudio = function() {

	fs.readdir('./recordings/', function(err, files) {
		if (files[files.length - 1] === 'mix.wav') {
			files.pop();
			fs.unlinkSync('./recordings/mix.wav');
		}
		if (files.length < 2) {
			console.log('NOT ENOUGH FILES TO MIX ANYTHING');
			return;
		}
		var ffmpegCommand = 'ffmpeg -i ./recordings/'+files[files.length - 1];
		ffmpegCommand += ' -i ./recordings/'+files[files.length - 2];
		ffmpegCommand += ' -filter_complex amix=inputs=2:duration=first:dropout_transition=2 ./recordings/mix.wav';
		exec(ffmpegCommand);
	})
};

var setUpButtonEvents = function() {
	document.getElementById("start").addEventListener("click", function(){
  	startRecording(audioStream);
  });
  document.getElementById("stop").addEventListener("click", function(){
  	stopRecording();
  });
  document.getElementById("play").addEventListener("click", function(){
  	mixAudio();
  });
};