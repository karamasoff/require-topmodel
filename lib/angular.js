/*jslint browser: true */
/*globals define, require */

define(['angular', 'lodash', "./registry"], function (angular, lodash, registry) {
    'use strict';

    var api_url = '',
        ModelService = 'ModelManager';

    return angular.module('RestTopModel', ['ng'])

        .factory('ModelManager', ['$q', function ($q) {

            return {
                get: function (key) {
                    return registry.getModel(key);
                },

                getInstance: function (modelPath, data) {
                    var that = this,
                        create_model = function (Model, rawData, relations) {
                            var instance = new Model(rawData);

                            // On a filtré parmi les relations du modèle, on ne traite que celles qui correspondent
                            // à des données dans cet objet

                            return $q.all(lodash.map(relations, function (modelPath2, relationName) {
                                return that.getInstance(modelPath2, instance[relationName]).then(function (whatINeed) {
                                    instance[relationName] = whatINeed;
                                });
                            })).then(function () {
                                return instance;
                            });
                        };

                    // si on n'a pas reçu de données, on s'assure quand même qu'on ait un objet.
                    if (!data) {
                        data = {};
                    }

                    return registry.getModel(modelPath).then(function (Model) {
                        var relations;
                        if (lodash.isArray(data)) {
                            return $q.all(lodash.map(data, function (subdata) {
                                relations = lodash.pick(Model.relations, function (value, key) {
                                    return subdata[key] !== undefined;
                                });
                                return create_model(Model, subdata, relations);
                            })).then(function (collection) {
                                return collection;
                            });
                        }

                        relations = lodash.pick(Model.relations, function (value, key) {
                            return data[key] !== undefined;
                        });
                        return create_model(Model, data, relations);
                    });
                },

                inject: function (httpResponse) {
                    var Model = httpResponse.config.model || false,
                        defered = $q.defer();

                    if (!Model) {
                        defered.resolve(httpResponse);
                    } else {
                        registry.getModel(Model).then(function (Model) {
                            httpResponse.rawData = httpResponse.data;

                            // lancement de l'hydratation
                            if (lodash.isArray(httpResponse.data)) {
                                httpResponse.data = lodash.map(httpResponse.data, function (value) {
                                    // on ne check que les objets, le reste va disparaitre.
                                    if (lodash.isObject(value)) {
                                        return new Model(value);
                                    }
                                });
                            } else if (lodash.isObject(httpResponse.data)) {
                                httpResponse.data = new Model(httpResponse.data);
                            }

                            defered.resolve(httpResponse);
                        });
                    }

                    return defered.promise;
                }
            };
        }])

        .provider('Api', function () {
            /**
             *  Définition du chemin de base de l'API REST.
             *
             *  @param {String} api_url Lien de base de l'API.
             *  @return {this}
             */
            this.setApiUrl = function (new_api_url) {
                api_url = /\/$/.test(new_api_url) ?
                        new_api_url.substring(0, new_api_url.length - 1) :
                        new_api_url;

                return this;
            };

            this.$get = ['$http', '$q', ModelService, function ($http, $q, MService) {
                var handleGet = function (path, config) {
                        var defered = $q.defer(),
                            success = function (response) {
                                MService.inject(response).then(function (response) {
                                    defered.resolve(response.data);
                                });
                            },
                            failure = function () {
                                defered.reject("Request failed.");
                            };

                        $http.get(api_url + '/' + path, config).then(success, failure);

                        return defered.promise;
                    };
                return {
                    get: handleGet,
                    post: function (path, data, config) {
                        return $http.post(api_url + '/' + path, data, config);
                    },
                    put: function (path, data, config) {
                        return $http.put(api_url + '/' + path, data, config);
                    },
                    delete: function (path, config) {
                        return $http.delete(api_url + '/' + path, config);
                    }
                };
            }];
        });
});
