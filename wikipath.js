$(function() {

  var urlPrefix = "https://en.wikipedia.org/w/api.php?format=json&action=query&callback=?"
  var wikiQueryUrl = "&list=backlinks&bltitle=Main%20Page&bllimit=5&blfilterredir=redirects"

  $("#start").click(function onStartClicked() {
    $.getJSON(urlPrefix+wikiQueryUrl, function onJsonReceived(data) {
      console.log(data);
    });

  });
})