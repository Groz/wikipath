function wikiAPI(root) {
  var path = "/w/api.php?format=json&callback=?&action=query";

  function query(pathSuffix, extractor, item, callback) {
    var url = root+path+pathSuffix;

    $.getJSON(url, function onJsonReceived(data) {
      var items = extractor(data);
      callback(item, items);
    });
  }

  function firstValue(obj) {
    for (var a in obj) return obj[a];
  }

  return {
    queryBacklinks: function(item, number, callback) {
      var term = item.term;
      var backlinksSuffix = "&list=backlinks&bltitle="+term+"&bllimit="+number+"&blfilterredir=nonredirects";
      query(backlinksSuffix, function(data) {
        return data.query.backlinks.map(function(e) { return e.title; });
      }, item, callback)
    },
    queryLinks: function(item, number, callback) {
      var term = item.term;
      var linksSuffix = "&prop=links&titles="+term+"&pllimit="+number;
      query(linksSuffix, function(data) {
        return firstValue(data.query.pages).links.map(function(e) { return e.title; });
      }, item, callback)
    },
    root: root
  };

}

$(function() {
  function crawl(maxDepth, seed, fetch, check, seen, finished, updateUI) {
    var crawlQueue = [seed];
    var intervalID;

    function stop() {
      clearInterval(intervalID);
    }

    function onCrawlResult(item, receivedTerms) {
      var src = item.term;
      var depth = item.depth;
      for (idx in receivedTerms) {
        var newTerm = receivedTerms[idx];

        if (seen[newTerm]) continue;

        seen[newTerm] = src;

        if (depth < maxDepth) {
          crawlQueue.push({ 
            depth: depth+1, 
            term: newTerm 
          });
        }
      }

      if (crawlQueue.length == 0)
        stop();
    }

    function onTimer() {
      if (check()) {
        stop();
        if (finished)
          return finished();
      }

      if (crawlQueue.length != 0) {
        console.log("Links to crawl: " + crawlQueue.length);
        var item = crawlQueue.shift();
        fetch(item, 200, onCrawlResult);
        updateUI(item.term);
      }
    }

    intervalID = setInterval(onTimer, 10);

    return {
      stop: stop
    };
  }

  var $currentCrawl = $("#currentCrawl");
  var $crawlCount = $("#crawlCount");
  var $resultsTable = $("#resultsTable");
  var $findPath = $("#findPath");
  var $stop = $("#stop");
  var $wikiRoot = $("#wikiRoot");

  var maxDepth = 3;

  var forwardCrawler, backCrawler;

  function unroll(seen, term, stopTerm) {
    var result = [term];

    while (term != stopTerm) {
      term = seen[term];
      result.push(term);
    }

    return result;
  }

  function onStartClicked() {
    var wiki = wikiAPI($wikiRoot.val());

    $findPath.prop('disabled', true);
    $stop.prop('disabled', false);

    var startTerm = $("#startTerm").val();
    var endTerm = $("#endTerm").val();
    
    $resultsTable.empty();

    var seenLinks = {}; // term, from
    var seenBacklinks = {}; // term, from
    var results = [];

    function check() { 
      var border = _.intersection(_.keys(seenLinks), _.keys(seenBacklinks)); 
      return border.length != 0;
    }

    function found() {
      var border = _.intersection(_.keys(seenLinks), _.keys(seenBacklinks)); 
      var shortestPath;

      for (var i in border) {
        var t = border[i];
        var forward = unroll(seenLinks, t, startTerm);
        var backward = unroll(seenBacklinks, t, endTerm);
        forward.reverse();
        backward.shift();
        var path = forward.concat(backward);
        if (!shortestPath || path.length < shortestPath.length)
        shortestPath = path;
      }

      var result = shortestPath.join(" -> ");
      if (!_.contains(results, result)) {
        results.push(result);
        showResult(shortestPath);
        console.log(result);
      }
    }

    function showResult(path) {
      $findPath.prop('disabled', false);
      $stop.prop('disabled', true);

      var $td = $('<td>');

      for (var term in path) {
        $td
          .append($('<a>')
          .attr('href', wiki.root+"/wiki/"+path[term])
          .text(path[term])
        );

        if (term < path.length-1) {
          $td.append($('<span>').text(" -> "));
        }
      }

      $resultsTable
        .append($('<tr>')
            .append($td)
        );
    }

    function updateUI(term) {
      $currentCrawl.text(term);
      $crawlCount.text(_.keys(seenLinks).length + _.keys(seenBacklinks).length);
    }

    forwardCrawler = crawl(maxDepth, { depth: 0, term: startTerm}, wiki.queryLinks, check, seenLinks, found, updateUI);
    backCrawler = crawl(maxDepth, { depth: 0, term: endTerm}, wiki.queryBacklinks, check, seenBacklinks, found, updateUI);
  }

  function onStopClicked() {
    forwardCrawler.stop();
    backCrawler.stop();
    $findPath.prop('disabled', false);
    $stop.prop('disabled', true);
  }

  // wiring callbacks
  $findPath.click(onStartClicked);
  $stop.click(onStopClicked);

});
