var _ = require('underscore');
var cdb = require('cartodb.js-v3');
var markdown = require('markdown');
var moment = require('moment');
var UserMetaView = require('../public_common/user_meta_view');
var MapCardPreview = require('../common/views/mapcard_preview');
var Utils = require('cdb.Utils');

var VISIBLE_TAG_COUNT = 3;
var VISUALIZATION_NUMBER = 3;

module.exports = cdb.core.View.extend({
  initialize: function () {
    this.template = cdb.templates.getTemplate('public_map/views/public_map_info');
    this._initModels();
  },

  render: function () {
    var description = _formattedDescription.call(this, this.vizdata.description);
    var formattedTags = _formattedTags.call(this, this.vizdata.tags);
    var totalMapViews = _totalMapViews.call(this, this.vizdata.stats);
    var overflowTags = _overflowTags.call(this, this.vizdata.tags.length);
    var disqusShortname = this.currentUser
      ? this.currentUser.get('disqus_shortname')
      : null;
    var disqusIdentifier = this.vizdata.id;
    var disqusPageTitle = this.vizdata.name;

    this.$el.html(this.template({
      description: description,
      disqusIdentifier: disqusIdentifier,
      disqusShortname: disqusShortname,
      formattedTags: formattedTags,
      mapCardsRepeat: _getMapCardsRepeat(this.visualizations.count),
      mapViews: 0,
      moreVisualizations: this.moreVisualizations,
      username: this.mapOwnerUser.nameOrUsername(),
      mapname: this.vizdata.name,
      overflowTags: overflowTags,
      showVisualizations: this.showVisualizations,
      tagUrl: this.mapOwnerUser.get('base_url') + '/' + this.mapOwnerUser.get('username') + '/tag',
      totalMapViews: totalMapViews,
      updatedAt: moment(this.vizdata.updated_at).fromNow(),
      user: this.currentUser
    }));

    this.userMetaView = new UserMetaView({
      el: this.$('.js-user-meta'),
      model: new cdb.core.Model({
        active: false
      })
    });

    if (disqusShortname) {
      var disqusTemplate = cdb.templates.getTemplate('common/views/disqus');
      this.$('.js-disqus').html(disqusTemplate({
        disqusShortname: disqusShortname,
        disqusIdentifier: disqusIdentifier,
        disqusPageTitle: disqusPageTitle
      }));
    }

    $('.MapCard').each(_addMapcardPreview);

    return this;
  },

  _initModels: function () {
    this.currentUser = this.options.currentUser;
    this.vizdata = this.options.vizdata;
    this.mapOwnerUser = this.options.mapOwnerUser;
    this.visualizations = _removeCurrentVisualizationIfPresent.call(this);
    this.showVisualizations = !!this.visualizations.length;
    this.moreVisualizations = this.showVisualizations
      ? _setMoreVisualizations.call(this)
      : [];
  }
});

function _formattedTags (tags) {
  return _.first(tags, VISIBLE_TAG_COUNT);
}

function _overflowTags (tags) {
  return tags > VISIBLE_TAG_COUNT
    ? tags - VISIBLE_TAG_COUNT
    : null;
}

function _formattedDescription (description) {
  return description
    ? Utils.stripHTML(markdown.toHTML(description))
    : '';
}

function _totalMapViews (stats) {
  var viewsCount = _.values(stats);
  return _.reduce(viewsCount, function (views, statCount) {
    return views + statCount;
  });
}

function _getMapCardsRepeat (count) {
  return ((VISUALIZATION_NUMBER * 2 - count) % VISUALIZATION_NUMBER);
}

function _setMoreVisualizations () {
  var visualizations = this.visualizations;
  var mapOwnerUser = this.mapOwnerUser;

  return _
    .first(visualizations, VISUALIZATION_NUMBER)
    .map(function (visualization) {
      return _addVisualizationData(visualization, mapOwnerUser);
    });
}

function _addVisualizationData (visualization, mapOwnerUser) {
  return _.extend(visualization, {
    publicMapUrl: mapOwnerUser.get('base_url') + '/viz/' + visualization.id + '/public_map',
    updatedAt: moment(visualization.updated_at).fromNow()
  })
}

function _addMapcardPreview () {
  var $mapCard = $(this);
  var visData = $mapCard.data();

  if (visData.visId) {
    var mapCardPreview = new MapCardPreview({
      el: $mapCard.find('.js-header'),
      visId: visData.visId,
      username: visData.visOwnerName,
      mapsApiResource: cdb.config.getMapsResourceName(visData.visOwnerName)
    });

    mapCardPreview.load();
  }
}

function _removeCurrentVisualizationIfPresent() {
  var visualizations = this.options.visualizations;
  var visId = this.options.vizdata.id;

  return _.filter(visualizations,
    function (visualization) {
      return visualization.id !== visId;
    });
}