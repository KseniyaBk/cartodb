var _ = require('underscore');
var Backbone = require('backbone');
var ModalsService = require('../../../../javascripts/cartodb3/components/modals/modals-service-model');
var LayerDefinitionModel = require('../../../../javascripts/cartodb3/data/layer-definition-model');
var EditorPane = require('../../../../javascripts/cartodb3/editor/editor-pane');
var WidgetDefinitionModel = require('../../../../javascripts/cartodb3/data/widget-definition-model');
var EditorModel = require('../../../../javascripts/cartodb3/data/editor-model');
var VisDefinitionModel = require('../../../../javascripts/cartodb3/data/vis-definition-model');
var ConfigModel = require('../../../../javascripts/cartodb3/data/config-model');
var UserModel = require('../../../../javascripts/cartodb3/data/user-model');
var PrivacyCollection = require('../../../../javascripts/cartodb3/components/modals/publish/privacy-collection');
var AnalysisDefinitionNodesCollection = require('../../../../javascripts/cartodb3/data/analysis-definition-nodes-collection');
var LayerDefinitionsCollection = require('../../../../javascripts/cartodb3/data/layer-definitions-collection');
var QuerySchemaModel = require('../../../../javascripts/cartodb3/data/query-schema-model');
var QueryGeometryModel = require('../../../../javascripts/cartodb3/data/query-geometry-model');
var QueryRowsCollection = require('../../../../javascripts/cartodb3/data/query-rows-collection');
var AppNotifications = require('../../../../javascripts/cartodb3/app-notifications');

describe('editor/editor-pane', function () {
  beforeEach(function () {
    jasmine.Ajax.install();
    jasmine.Ajax.stubRequest(new RegExp('.*api/v2/sql.*'))
      .andReturn({
        status: 200,
        responseText: '{"rows":[{},{},{}]}'
      });

    this.configModel = new ConfigModel({
      base_url: '/u/pepe'
    });

    AppNotifications.init();

    this.userModel = new UserModel({
      limits: {
        max_layers: 2
      },
      actions: {
        private_maps: true,
        private_tables: true
      }
    }, {
      configModel: this.configModel
    });

    this.layerDefinitionModel = new LayerDefinitionModel({
      id: 'l-1',
      options: {
        type: 'CartoDB',
        table_name: 'foo',
        source: 'a0'
      }
    }, {
      parse: true,
      configModel: {},
      stateDefinitionModel: {}
    });

    var querySchemaModel = new QuerySchemaModel({
      query: 'SELECT * FROM foo',
      status: 'fetched'
    }, {
      configModel: this.configModel
    });

    var queryGeometryModel = new QueryGeometryModel({
      status: 'fetched',
      simple_geom: '',
      query: 'SELECT * FROM foo'
    }, {
      configModel: this.configModel
    });

    var queryRowsCollection = new QueryRowsCollection([], {
      configModel: this.configModel,
      querySchemaModel: querySchemaModel
    });

    var analysisDefinitionNodesCollection = new AnalysisDefinitionNodesCollection(null, {
      configModel: this.configModel,
      userModel: this.userModel
    });

    this.analysisDefinitionNodeModel = analysisDefinitionNodesCollection.add({
      id: 'a0',
      type: 'source',
      table_name: 'foo',
      params: {
        query: 'SELECT * FROM foo'
      }
    });
    this.analysisDefinitionNodeModel.querySchemaModel = querySchemaModel;
    this.analysisDefinitionNodeModel.querySchemaModel.hasGeometryData = function () {
      return true;
    };
    this.analysisDefinitionNodeModel.queryGeometryModel = queryGeometryModel;
    this.analysisDefinitionNodeModel.queryRowsCollection = queryRowsCollection;

    spyOn(this.layerDefinitionModel, 'getAnalysisDefinitionNodeModel').and.returnValue(this.analysisDefinitionNodeModel);

    this.privacyCollection = new PrivacyCollection([{
      privacy: 'PUBLIC',
      title: 'Public',
      desc: 'Lorem ipsum',
      cssClass: 'is-green',
      selected: true
    }, {
      privacy: 'LINK',
      title: 'Link',
      desc: 'Yabadababa',
      cssClass: 'is-orange'
    }, {
      privacy: 'PASSWORD',
      title: 'Password',
      desc: 'Wadus'
    }, {
      privacy: 'PRIVATE',
      title: 'Private',
      desc: 'Funínculo',
      cssClass: 'is-red'
    }]);

    this.widgetDefinitionsCollection = new Backbone.Collection();

    this.visDefinitionModel = new VisDefinitionModel({
      name: 'Foo Map',
      privacy: 'PUBLIC',
      updated_at: '2016-06-21T15:30:06+00:00',
      type: 'derived',
      permission: {}
    }, {
      configModel: this.configModel
    });

    this.mapStackLayoutModel = jasmine.createSpyObj('stackLayoutModel', ['prevStep', 'nextStep', 'goToStep']);

    this.modals = new ModalsService();

    this.mapcapsCollection = new Backbone.Collection([{
      created_at: '2016-06-21T15:30:06+00:00'
    }]);

    this.analysisDefinitionNodesCollection = new AnalysisDefinitionNodesCollection(null, {
      configModel: this.configModel,
      userModel: {}
    });

    this.layerDefinitionsCollection = new LayerDefinitionsCollection([
      this.layerDefinitionModel
    ], {
      configModel: this.configModel,
      userModel: this.userModel,
      analysisDefinitionNodesCollection: this.analysisDefinitionNodesCollection,
      mapId: 'map-123',
      stateDefinitionModel: {}
    });

    this.layerDefinitionsCollection.loadAllQueryGeometryModels = function (callback) {
      callback();
    };

    this.layerDefinitionsCollection.isThereAnyGeometryData = function () {
      return this.some(function (layerDefModel) {
        var querySchemaModel = layerDefModel.getAnalysisDefinitionNodeModel().querySchemaModel;
        return querySchemaModel.hasGeometryData();
      });
    };

    this.onboardingNotification = {
      getKey: function () { return false; }
    };

    this.view = new EditorPane({
      visDefinitionModel: this.visDefinitionModel,
      modals: this.modals,
      privacyCollection: this.privacyCollection,
      mapcapsCollection: this.mapcapsCollection,
      analysis: {},
      userActions: {},
      userModel: this.userModel,
      editorModel: new EditorModel(),
      pollingModel: new Backbone.Model(),
      configModel: this.configModel,
      analysisDefinitionNodesCollection: this.analysisDefinitionNodesCollection,
      layerDefinitionsCollection: this.layerDefinitionsCollection,
      widgetDefinitionsCollection: this.widgetDefinitionsCollection,
      mapStackLayoutModel: this.mapStackLayoutModel,
      selectedTabItem: 'widgets',
      stateDefinitionModel: {},
      onboardingNotification: this.onboardingNotification
    });

    this.view.render();
  });

  afterEach(function () {
    AppNotifications.off();
    jasmine.Ajax.uninstall();
  });

  it('should have no leaks', function () {
    expect(this.view).toHaveNoLeaks();
  });

  it('should render correctly', function () {
    expect(this.view.$el.text()).toContain('editor.button_add');
  });

  it('should create PanelWithOptionsView with selector for onboarding', function () {
    var contentView = this.view._mapTabPaneView.collection.at(0).attributes.createContentView();
    var stackView = contentView.collection.at(0).attributes.createStackView();

    expect(stackView.className).toEqual('Editor-content js-editorPanelContent');
  });

  it('should have two subviews', function () {
    expect(_.size(this.view._subviews)).toBe(3);
  });

  describe('._onLayerCollectionAdd', function () {
    it('should fetch visualization privacy if a new layer is added', function () {
      var layerDefModel2 = new LayerDefinitionModel({
        id: 'l-101',
        kind: 'carto'
      }, {
        parse: true,
        configModel: {},
        stateDefinitionModel: {}
      });

      spyOn(this.view._visDefinitionModel, 'fetch');
      this.view._layerDefinitionsCollection.add(layerDefModel2);
      expect(this.view._visDefinitionModel.fetch).toHaveBeenCalled();
    });
  });

  describe('add button', function () {
    beforeEach(function () {
      this.widgetDefModel = new WidgetDefinitionModel({
        type: 'formula',
        title: 'formula example',
        layer_id: 'l-1',
        column: 'areas',
        operation: 'avg',
        order: 0
      }, {
        configModel: {},
        mapId: 'm-123'
      });
    });

    it('should be displayed when there are items on the selected tab', function () {
      expect(this.view.$('.js-add').hasClass('is-hidden')).toBeTruthy();

      this.widgetDefinitionsCollection.add(this.widgetDefModel);
      expect(this.view.$('.js-add').hasClass('is-hidden')).toBeFalsy();
    });

    it('should be hidden when an item is removed', function () {
      this.widgetDefinitionsCollection.add(this.widgetDefModel);
      this.widgetDefinitionsCollection.reset([]);
      expect(this.view.$('.js-add').hasClass('is-hidden')).toBeTruthy();
    });
  });

  describe('max layers', function () {
    var otherLayer = new LayerDefinitionModel({
      id: 'l-2',
      options: {
        type: 'torque',
        table_name: 'fee',
        source: 'a1'
      }
    }, {
      parse: true,
      configModel: {},
      stateDefinitionModel: {}
    });

    afterEach(function () {
      this.view._layerDefinitionsCollection.remove(otherLayer);
    });

    it('should have no infobox state by default', function () {
      expect(this.view._infoboxModel.get('state')).toBe(null);
    });

    it('should enable add button by default', function () {
      expect(this.view.$('.js-add').hasClass('is-disabled')).toBeFalsy();
    });

    it('should disable the add button when max layers are reached', function () {
      this.view._layerDefinitionsCollection.add(otherLayer);
      expect(this.view.$('.js-add').hasClass('is-disabled')).toBeTruthy();
    });

    it('should re-enable the add button when we remove a layer after max layers are reached', function () {
      this.view._layerDefinitionsCollection.add(otherLayer);
      this.view._layerDefinitionsCollection.remove(otherLayer);
      expect(this.view.$('.js-add').hasClass('is-disabled')).toBeFalsy();
    });

    it('should show the max-layers infobox when max layer are reached', function () {
      this.view._layerDefinitionsCollection.add(otherLayer);
      expect(this.view._infoboxModel.get('state')).not.toBe(null);
    });

    it('should remove the max-layers infobox when max layer is not reached', function () {
      this.view._layerDefinitionsCollection.add(otherLayer);
      this.view._layerDefinitionsCollection.remove(otherLayer);
      expect(this.view._infoboxModel.get('state')).toBe(null);
    });

    it('should show the limit infobox if there is a limit notification', function () {
      AppNotifications.addNotification({ type: 'limit' });

      this.view.render();

      expect(this.view._infoboxModel.get('state')).toBe('limit');
      expect(this.view.$('.Infobox').length).toBe(1);
      expect(this.view.$('.Infobox').html()).toContain('editor.messages.limit');
    });
  });
});
