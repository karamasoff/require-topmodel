/*jslint browser: true */
/*globals define, require */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'lodash', 'q', './registry'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('lodash'), require('q'), require('./registry'));
    } else {
        // Browser globals
        factory((root.commonJsStrict = {}), root._, root.q, root.Registry);
    }
}(this, function (exports, lodash, q, Registry) {
    'use strict';

    var relationPicker = function (data) {
        return function (value, key) {
            var relation,
                relation_key = value.key || key;
            relation = lodash.reduce(relation_key.split('.'), function (result, key) {
                return result[key];
            }, data);
            return relation !== undefined;
        };
    };

    exports = {
        get: function (key) {
            return Registry.getModel(key);
        },

        getInstance: function (modelPath, data, polymorphKey) {
            var that = this,
                create_model = function (Model, rawData, relations) {
                    var instance = new Model(rawData);

                    // On a filtré parmi les relations du modèle, on ne traite que celles qui correspondent
                    // à des données dans cet objet

                    return q.all(lodash.map(relations, function (relationData, relationName) {
                        var modelPath2 = relationData.path || relationData,
                            content = (relationData.key && lodash.reduce(relationData.key.split('.'), function (result, key) {
                                    return result[key];
                                }, instance)) || instance[relationName];
                        return that.getInstance(modelPath2, content)
                            .then(function (whatINeed) {
                                instance[relationName] = whatINeed;
                            })
                            .catch(function (err) {
                                console.log(err);
                            });
                    }))
                        .then(function () {
                            return instance;
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                };

            // si on n'a pas reçu de données, on s'assure quand même qu'on ait un objet.
            if (!data) {
                data = {};
            }

            if (lodash.isString(modelPath)) {

                return Registry.getModel(modelPath)
                    .then(function (Model) {
                        var inject_data = function (data) {
                            var relations = lodash.pickBy(Model.relations, relationPicker(data));
                            return create_model(Model, data, relations);
                        };

                        // tableau d'objets à injecter
                        if (lodash.isArray(data)) {
                            return q.all(lodash.map(data, inject_data));
                        }

                        // un seul objet à injecter
                        return inject_data(data);
                    });
            } else {
                return q.all(lodash.map(data, function (item) {
                    if (item[polymorphKey] !== undefined && modelPath[item[polymorphKey]] !== undefined) {
                        return Registry.getModel(modelPath[item[polymorphKey]])
                            .then(function (Model) {
                                var inject_data = function (data) {
                                    var relations = lodash.pickBy(Model.relations, relationPicker(data));
                                    return create_model(Model, data, relations);
                                };

                                return inject_data(item);
                            });
                    }
                }));
            }
        }
    };
    return exports;
}));