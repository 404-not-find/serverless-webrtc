/* See also:
    http://www.html5rocks.com/en/tutorials/webrtc/basics/
    https://code.google.com/p/webrtc-samples/source/browse/trunk/apprtc/index.html

    https://webrtc-demos.appspot.com/html/pc1.html
*/

var cfg = {"iceServers":[{"url":"stun:23.21.150.121"}]},
    con = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

// createDataChannel needs `open /Applications/Google\ Chrome\ Canary.app --args --enable-data-channels` :-(

function remoteOfferClick() {
    var offer = document.remoteOfferForm.remoteOffer.value;
    console.log(offer);
    var offerJSON = JSON.parse(offer);
    var offerDesc = new RTCSessionDescription(offerJSON);
    handleOfferFromPC1(offerDesc);
}

function remoteAnswerClick() {
    var answer = document.remoteAnswerForm.remoteAnswer.value;
    var answerDesc = new RTCSessionDescription(JSON.parse(answer));
    handleAnswerFromPC2(answerDesc);
}

function remoteICECandidateClick() {
    var candidate = document.remoteICECandidateForm.remoteICECandidate.value;
    var candidateDesc = new RTCIceCandidate(JSON.parse(candidate));
    handleCandidateFromPC2(candidateDesc);
}
/* THIS IS ALICE, THE CALLER/SENDER */

var pc1 = new RTCPeerConnection(cfg, con),
    dc1 = null, tn1 = null;

var pc1icedone = false;

$('#myModal').modal('show');

document.getElementById('userInfo').addEventListener('click', function() {
    console.log("click");
    $('#myModal').modal('hide');
}, true);

function setupDC1() {
    try {
        dc1 = pc1.createDataChannel('test', {reliable:false});
        console.log("Created datachannel (pc1)");
        dc1.onmessage = function (e) {
            console.log("Got message (pc1)", e.data);
        };
    } catch (e) { console.warn("No data channel (pc1)", e); }
}

getUserMedia({'audio':true, fake:true}, function (stream) {
    console.log("Got local audio", stream);
    pc1.addStream(stream);
    setupDC1();
    //tn1 = pc1.createDTMFSender(pc1.getLocalStreams()[0].getAudioTracks()[0])
    pc1.createOffer(function (offerDesc) {
        console.log("Got offer", offerDesc);
        pc1.setLocalDescription(offerDesc);
        document.localOfferForm.localOffer.value = JSON.stringify(offerDesc);
    }, function () { console.warn("No create offer"); });

}, function () { console.warn("No audio"); });

pc1.onicecandidate = function (e) {
    console.log("ICE candidate (pc1)", e);
    if (e.candidate) {
        //handleCandidateFromPC1(e.candidate)
        if (!pc1icedone) {
            document.localICECandidateForm.localICECandidate.value = JSON.stringify(e.candidate);
            pc1icedone = true;
        }
    }
};

pc1.onconnection = function() {
};

function handleAnswerFromPC2(answerDesc) {
    pc1.setRemoteDescription(answerDesc);
}

function handleCandidateFromPC2(iceCandidate) {
    pc1.addIceCandidate(iceCandidate);
}

document.getElementById('msg1').addEventListener('click', function () {
    if (tn1) tn1.insertDTMF('123213');
    if (dc1) dc1.send("ping");
}, false);


/* THIS IS BOB, THE ANSWERER/RECEIVER */

var pc2 = new RTCPeerConnection(cfg, con),
    dc2 = null;

var pc2icedone = false;

pc2.ondatachannel = function (e) {
    var datachannel = e.channel || e; // Chrome sends event, FF sends raw channel
    console.log("Received datachannel (pc2)", arguments);
    dc2 = datachannel;
    dc2.onmessage = function (e) {
        console.log("Got message (pc2)", e.data);
    };
};

function handleOfferFromPC1(offerDesc) {
    pc2.setRemoteDescription(offerDesc);
    pc2.createAnswer(function (answerDesc) {
        console.log("Got answer", answerDesc);
        pc2.setLocalDescription(answerDesc);
        document.localAnswerForm.localAnswer.value = JSON.stringify(answerDesc);
        // handleAnswerFromPC2(answerDesc); // cjb
    }, function () { console.warn("No create answer"); });
}

pc2.onicecandidate = function (e) {
    console.log("ICE candidate (pc2)", e);
    if (e.candidate) handleCandidateFromPC2(e.candidate)
};

function handleCandidateFromPC1(iceCandidate) {
    pc2.addIceCandidate(iceCandidate);
}

pc2.onaddstream = function (e) {
    console.log("Got remote stream", e);
    var el = new Audio();
    el.autoplay = true;
    attachMediaStream(el, e.stream);
};

pc2.onconnection = function() {
};

document.getElementById('msg2').addEventListener('click', function () {
    if (dc2) dc2.send("pong");
}, false);
