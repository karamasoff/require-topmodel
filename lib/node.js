/*jslint node: true, unparam: true, nomen: true */
(function () {
    'use strict';

    var lib = function (config) {
        var requirejs = require('requirejs'),
            lodash = require('lodash'),
            service;

        requirejs.config(config);

        service = {
            load: function (modulePath) {
                return requirejs(modulePath);
            },
            inject: function (modelPath, data) {
                var that = this,
                    relationPicker = function (data) {
                        return function (value, key) {
                            var relation,
                                relation_key = value.key || key;
                            relation = lodash.reduce(relation_key.split('.'), function (result, key) {
                                return result[key];
                            }, data);
                            return relation !== undefined;
                        }
                    },
                    loadMixins = function (Model, MainModel) {
                        var ToInjectInto = MainModel || Model;

                        if (!Model) {
                            var err = new Error('Model with path [' + modelPath + '] is undefined');
                            err.requirejs_config = config;
                            throw err;
                        }

                        if (Model.mixins === undefined || lodash.isEmpty(Model.mixins)) {
                            return ToInjectInto;
                        }

                        lodash.map(Model.mixins, function (options, mixinPath) {
                            var Mixin = service.load(mixinPath);

                            // merge relations
                            if (Mixin.relations !== undefined) {
                                lodash.merge(ToInjectInto.relations, Mixin.relations);
                            }

                            Mixin.call(ToInjectInto.prototype, options);

                            // merge sub-mixins
                            loadMixins(Mixin, ToInjectInto);
                        });
                    },
                    create_model = function (Model, rawData) {
                        var instance = new Model(rawData),
                            relations = lodash.pickBy(Model.relations, relationPicker(rawData));

                        // On a filtré parmi les relations du modèle, on ne traite que celles qui correspondent
                        // à des données dans cet objet
                        lodash.map(relations, function (relationData, relationName) {
                            var modelPath2 = relationData.path || relationData,
                                content = (relationData.key && lodash.reduce(relationData.key.split('.'), function (result, key) {
                                        return result[key];
                                    }, instance)) || instance[relationName];

                            instance[relationName] = that.inject(modelPath2, content);

                        });
                        return instance;
                    };

                // si on n'a pas reçu de données, on s'assure quand même qu'on ait un objet.
                if (!data) {
                    data = {};
                }

                var Model = service.load(modelPath),
                    inject_data = function (data) {
                        return create_model(Model, data);
                    };

                // injection des mixins
                loadMixins(Model);

                // tableau d'objets à injecter
                if (lodash.isArray(data)) {
                    return lodash.map(data, inject_data);
                }

                // un seul objet à injecter
                return inject_data(data);
            },

            getEmpty: function (modelPath) {
                return service.inject(modelPath);
            }
        };

        return service;
    };

    module.exports = lib;
}());