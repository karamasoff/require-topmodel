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
                                    /*jslint unparam:true*/
                                    return subdata[key] !== undefined;
                                });
                                return create_model(Model, subdata, relations);
                            })).then(function (collection) {
                                return collection;
                            });
                        }

                        relations = lodash.pick(Model.relations, function (value, key) {
                            /*jslint unparam:true*/
                            return data[key] !== undefined && data[key];
                        });
                        return create_model(Model, data, relations);
                    });
                },

                inject: function (httpResponse) {
                    var Model = httpResponse.config.model || false,
                        defered = $q.defer();

                    if (!Model) {
                        defered.resolve(httpResponse.data);
                        return defered.promise;
                    }

                    return this.getInstance(Model, httpResponse.data);
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
                var /**
                     * Création d'un gestionaire "dummy", passe simplement le résultat de la promesse.
                     *
                     * @param  {$q}     deferred Objet de promesse
                     * @param  {String} action  Action (résultat) de la promesse: resolve ou reject
                     * @return {Function}       Callback pour la promesse parente
                     */
                    passResult = function (deferred, action) {
                        return function () {
                            deferred[action].apply(this, arguments);
                        };
                    },

                    /**
                     * Création d'un gestionaire qui extrait data.data.
                     *
                     * @param  {$q}     deferred Objet de promesse
                     * @param  {String} action  Action (résultat) de la promesse: resolve ou reject
                     * @return {Function}       Callback pour la promesse parente
                     */
                    passData = function (deferred, action) {
                        return function (data, status, headers, config) {
                            deferred[action](data.data || {}, status, headers, config);
                        };
                    },

                    /**
                     * Création d'un gestionaire d'injection de model.
                     *
                     * @param  {$q}     deferred Objet de promesse
                     * @param  {String} action  Action (résultat) de la promesse: resolve ou reject
                     * @return {Function}       Callback pour la promesse parente
                     */
                    injectModel = function (deferred, action) {
                        return function (response, status, headers, config) {
                            MService.inject(response).then(function (injected) {
                                deferred[action](injected, status, headers, config);
                            });
                        };
                    },

                    /**
                     * Création d'un gestionaire de requête.
                     *
                     * @param  {String} method  Méthode HTTP
                     * @param  {Function} success Gestionaire de success pour ce type de requête
                     * @param  {Function} failure Gestionaire d'erreur pour ce type de requête
                     * @return {Function}         Fonction de requête
                     */
                    getRequestHandler = function (method, success, failure) {
                        return function (path, data, config) {
                            var deferred = $q.defer();

                            $http[method](api_url + '/' + path, data, config).then(
                                success(deferred, 'resolve'),
                                failure(deferred, 'reject')
                            );

                            return deferred.promise;
                        };
                    };

                return {
                    get: getRequestHandler('get', injectModel, passResult),
                    post: getRequestHandler('post', passData, passResult),
                    put: getRequestHandler('put', passData, passResult),
                    delete: getRequestHandler('delete', passResult, passResult)
                };
            }];
        });
});
