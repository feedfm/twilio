var express = require('express'),
    http = require('http'),
    agent = require('superagent'),
    cache = require('memory-cache');
 
var feedToken = 'demo',
    feedSecret = 'demo',
    userPass = new Buffer(feedToken + ':' + feedSecret).toString('base64'),
    host = 'http://54.186.190.255:8080'; // replace this with your host address
 
var app = express();
 
app.use(express.bodyParser());
 
app.post('/', function(req, res, next) {
  res.type('text/xml');
 
  res.send('<Response>' +
           ' <Say>Hello there, please hold!</Say>' +
           ' <Enqueue waitUrl="' + host + '/hold">support</Enqueue>' +
           '</Response>');
});
app.post('/hold', function(req, res, next) {
  var from = req.body.From || 'unknown';
 
  if (req.body.FromCountry != 'US') {
    return res.send('<Response><Say>We\'ll be with you momentarily!</Say><Pause length="10"/></Response>');
  }
 
  getClientId(from, function(clientId) {
    agent
      .post('https://feed.fm/api/v2/play')
      .send({ client_id: clientId })
      .set('Authorization', 'Basic ' + userPass)
      .end(function(err, r) {
 
        agent
          .post('https://feed.fm/api/v2/play/' + r.body.play.id + '/start')
          .set('Authorization', 'Basic ' + userPass)
          .end(function(err) {
 
            console.log('playing ' + r.body.play.audio_file.url + ' for ' + from);
 
            res.type('text/xml');
            res.send('<Response><Play>' + r.body.play.audio_file.url + '</Play></Response>');
          });
      });
  });
 
});
 
http.createServer(app).listen(8080);
 
/* Map an incoming caller to a Feed.fm client id */
function getClientId(from, next) {
  var clientId = cache.get(from);
 
  if (clientId) {
    return next(clientId);
 
  } else {
    agent
      .post('https://feed.fm/api/v2/client')
      .set('Authorization', 'Basic ' + userPass)
      .end(function(err, res) {
        cache.put(from, res.body.client_id, 1000 * 60 * 60 * 24);
        return next(res.body.client_id);
      });
  }
}
