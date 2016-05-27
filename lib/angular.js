/*jslint browser: true */
/*globals define, require */
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['angular', 'lodash', "./injector"], factory);
    } else {
        // Browser globals
        root.amdWeb = factory(root.angular, root._, root.injector);
    }
}(this, function (angular, lodash, injector) {
    'use strict';

    var api_url = '',
        ModelService = 'ModelManager',
        toQueryString = function (obj) {
            return lodash.map(obj, function (v, k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(v);
            }).join('&');
        },
        setApiUrl = function (new_api_url) {
            api_url = /\/$/.test(new_api_url) ?
                new_api_url.substring(0, new_api_url.length - 1) :
                new_api_url;

            return this;
        };

    return angular.module('RestTopModel', ['ng'])

        .factory('ModelManager', ['$q', function ($q) {
            return {
                get: injector.get,
                getInstance: injector.getInstance,

                inject: function (httpResponse) {
                    var Model = httpResponse.config.model || false,
                        defered = $q.defer(),
                        response_key = httpResponse.config.modelkey || false,
                        response_data = httpResponse.data;

                    if (response_key) {
                        response_data = response_data[response_key] || false;
                    }
                    
                    if (!response_data) {
                        defered.resolve(null);
                        return defered.promise;
                    }

                    if (!Model) {
                        defered.resolve(response_data);
                        return defered.promise;
                    }

                    return this.getInstance(Model, response_data);
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
            this.setApiUrl = setApiUrl;

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
                            var deferred = $q.defer(),
                                resource,
                                query_string;

                            if (path.substr(0, 4) !== 'http') {
                                resource = api_url + (path.substr(0, 1) !== '/' ? '/' : '') + path;
                            } else {
                                resource = path;
                            }

                            // si on appelle une route en GET et qu'on a passé un hash de paramètres
                            // on va les convertir en querystring pour le service d'angular, à l'exception des clés 'model' et 'modelkey'
                            // utilisée pour l'injection de modèles
                            if (method === 'get' && data !== undefined) {
                                query_string = toQueryString(lodash.omit(data, ['model', 'modelkey']));
                                resource = resource.indexOf('?') !== -1 ? resource + '&' + query_string : resource + '?' + query_string;
                            }

                            // cas particulier du DELETE a qui on a envoyé des data
                            if (method === 'delete' && data !== undefined && config !== undefined) {
                                config.data = lodash.cloneDeep(data);
                                data = config;
                            }

                            $http[method](resource, data, config).then(
                                success(deferred, 'resolve'),
                                failure(deferred, 'reject')
                            );

                            return deferred.promise;
                        };
                    };

                return {
                    get: getRequestHandler('get', injectModel, passResult),
                    post: getRequestHandler('post', injectModel, passResult),
                    put: getRequestHandler('put', injectModel, passResult),
                    delete: getRequestHandler('delete', passResult, passResult),
                    setApiUrl: setApiUrl
                };
            }];
        });
}));
