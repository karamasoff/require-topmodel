Require topmodel
================

RequireJS model injector

- Implement promise interface.
- Model injection
- Nested relations and mixins management
- Works with angularJS
- Works with NodeJS
- Provided with an angular Rest client

## Prerequisites and apologizes

Please, read this documentation like a novel... it's not really written like an API reference, but more like a story and I apologize for that. It is indeed quite complicated to just jump to a part and try to understand it.

Actually, it is also difficult to read it from the beginning to the end and try to understand it :-o  
And I apologize for that...

## Installation

For a browser usage, install with bower

`bower install --save require-topmodel`

For a server usage, install with node

`npm install --save require-topmodel`

## Models definition

You must define your models the requireJS way (AMD-style), even if you plan to use it server-side.

Let's say I have a Car model, looking like this and saved in a car.js file.  
*I use lodash as a life-simplifier, but it's not mandatory...*
```javascript
define([
    'lodash'
], function (lodash) {
    'use strict';
    var Car = function (data) {
        lodash.assign(this, data);
    };

    Car.relations = {};
    Car.mixins = {};
    lodash.assign(Car.prototype, {
        start: function () {
        	this.engineStarted = true;
        },
        getSpeed: function () {
        	return this.speed;
        }
    });

    return Car;
});
```

## Models injection

Require-topmodel's purpose is to take raw JSON data and inject them into models.
Usually, you do that when you just retrieved some data from an API call, but you can inject data from anywhere.
Let's take a common example:

I have an API route giving me a car detail.  
`
GET http://mydomain.com/api/cars/1234567
`

And I have my `Car` model, defined just above.  

Let's call the API route and inject the model.
```javascript
Api.get('http://mydomain.com/api/cars/1234567', {model: 'path/to/car'})
	.then(function (car) {
    	car.start();
    	console.log(car.getSpeed());
    });
```
Some explanation about this code:
- Api is an angular factory that encapsulate $http service and exposes some access methods. It returns a promise.
- To inject the model, you just have to passe a 'model' key in the config object. The value should be the requireJS path to the model file. If you know a little bit requireJS, you know you might define a baseUrl config. Require-topmodel uses this config to resolve the models paths.
- When the promise resolves, the resulting callback will contain a Car instance, on which you will be able to call any method or property defined in the model file. \o/

> Damn ! do I really have to write the entire route path in the Api.get() method ? That's awful! Shame! Shame! Dingdingding!

Okay, okay... how about that ?

```javascript
var app = angular.module('myApp', ['RestTopModel']);
app.config(['ApiProvider', function (ApiProvider) {
	ApiProvider.setApiUrl('http://mydomain.com/api');
}]);
```
I let you put this base URL in a config file. I won't do all the job for you :)

## Relations and Mixins

Maybe you've noticed in the previous example that there were 2 mysterious properties on our Car model.  
You can populate these properties to build more complex models, by defining relations between models or adding some behaviours through mixins.

> Hint: Mixins are awesome here, because you can define others mixins and relations inside a mixin, simply by populating the same 'mixins' and 'relations' properties on your mixin.

### Simple relation example

Let's take back our preceding Car model and focus on its relations, at first..
```javascript
define([
    'lodash'
], function (lodash) {
    'use strict';
    var Car = function (data) {
        lodash.assign(this, data);
    };
    
    Car.relations = {
    	Options: 'path/to/option',
        Driver: {
        	key: 'guy',
            path: 'path/to/user'
        }
    };
    
    Car.mixins = {}; // we will see that later...
    
    lodash.assign(Car.prototype, {
        getOptions: function () {
        	return this.Options;
        },
        getDriver: function () {
        	return this.Driver;
        }
    });
    
	return Car;
});
```
You can define relations in 2 manners. In both cases, the key will be the relation name.
- simple manner: value is just the path to the related model's file
- complex manner: value is an object that defines the relation. This object must contain a 'key' key that indicate require-topmodel on which key the relation data are AND a 'path' key that references the related model's file.

You're smart, and you've already understood that:

```javascript
Options: 'path/to/option'
```

and

```javascript
Options: {
	key: 'Options',
    path: 'path/to/option'
}
```

are exactly the same.  
So the first one is just a syntactic-sugar if your key needn't to be renamed.

### Simple mixin example

Now we will extend our example with a simple mixin.

```javascript
define([
    'lodash'
], function (lodash) {
    'use strict';
    var Car = function (data) {
        lodash.assign(this, data);
    };
    
    Car.relations = {
    	Options: 'path/to/option',
        Driver: {
        	key: 'guy',
            path: 'path/to/user'
        }
    };
    
    // add some new behaviour to Car prototype
    Car.mixins = {
    	'path/to/batmobile': {}
    };
    
    lodash.assign(Car.prototype, {
        getOptions: function () {
        	return this.Options;
        },
        getDriver: function () {
        	return this.Driver;
        }
    });
    
	return Car;
});
```

Here we linked a mixin to add some new powers to our car. Awesome ! I'm batman !  
Okay, but what's a mixin ? How does it look like ?

Here is the mixin (batmobile.js) that powers up your already awesome car.  
*Don't forget to define it the AMD way, also !*

```javascript
define([], function () {
    'use strict';

    /**
     * Gimme some batpowers !
     */
    return function (options) {

        this.turboBoost = function (speed) {
        	// there could be some turbo boost speed limitation amongst countries...
        	if (options.maxspeed && speed > options.maxspeed) {
            	speed = options.maxspeed;
            }
            this.turboBoostEnabled = true;
            this.speed = speed;
        };

        this.fireMissile = function () {
            throw new Error("to be implemented...");
        };

        return this;
    };
});
```

This is a common mixin pattern. Require-topmodel just applies it for our greatest pleasure.  
From now, our car can speed up like hell!

```javascript
// car is a Car instance
car.turboBoost(400);
console.log(car.getSpeed()); // 400 ! OMG ! I pee my pants !
```

But, hey! What's that speed limitation thing ? And what's that strange empty object `{}` you passed as a value when linking the mixin ?  
Nice check! You got the point, Charly! There is indeed a way to customize your mixins. Let's look back to our mixin example and add some configuration to it:

```javascript
	// add some new behaviour to Car prototype
    Car.mixins = {
    	'path/to/batmobile': {
        	maxspeed: 120
        }
    };
```

And now, let's try to turboBoost that old car...

```javascript
// car is a Car instance
car.turboBoost(400);
console.log(car.getSpeed()); // 120. Wat ? Sigh...... f*** switzerland :(
```

Well, at least I still can fire one or two missiles to relax myself...

```javascript
// car is a Car instance
car.fireMissile(); // "to be implemented..." Wat ??? Damn !
```

__That's a good opportunity to present a great feature of require-topmodel: nested-whatever.__

You can add other mixins or relations inside a mixin. That means you can add a mixin that will add behaviours (new methods) to your object, but that also can define new relations to your object, or even inject others mixins that will add other behaviours or define even more relations to your very object.

Let's take an example and fire some missiles.  
First we need a `Missile` object, in a missile.js file.

```javascript
define([
    'lodash'
], function (lodash) {
    'use strict';
    var Missile = function (data) {
        lodash.assign(this, data);
    };
    
    lodash.assign(Missile.prototype, {
        goToTarget: function (gpsCoords) {
        	// whatever
        },
        
        lockOnMovingTarget: function (target) {
        	// whatever
        },
        
        burst: function () {
        	console.log("BRAAOUM");
        }
    });
    
	return Missile;
});
```

Then we can ask our batmobile mixin to add a relation between its host (our `Car` instance) and this `Missile` object.  
There is a few modifications to do... essentially not returning directly an anonymous object.

```javascript
define([], function () {
    'use strict';

    /**
     * Gimme some batpowers !
     */
    var Mixin = function (options) {

        this.turboBoost = function (speed) {
        	// there could be some turbo boost speed limitation amongst countries...
        	if (options.maxspeed && speed > options.maxspeed) {
            	speed = options.maxspeed;
            }
            this.turboBoostEnabled = true;
            this.speed = speed;
        };
        
        this.getMissiles = function () {
        	return this.Missiles;
        };
                
        this.countMissiles = function () {
        	return this.Missiles.length;
        };

        this.fireMissile = function (target) {
        	var missile;
            if (this.countMissiles() === 0) {
            	throw new Error("No more missile");
            }
            
            // return the first element of array and remove it from the array.
            missile = lodash.pullAt(this.getMissiles(), 0)[0];
            
            missile.lockOnMovingTarget(target);
            return missile;
        };

        return this;
    };
    
    // define relations exactly as you would do in your main object.
    Mixin.relations = {
    	Missiles: {
          key: 'missiles',
          path: 'path/to/missile'
        }
    };
    
    return Mixin;
});
```

Here we are! Our batmobile can fire missiles :) Life just became more sweet.

> Hint: require-topmodel will handle itself if your relation is 1-1 or 1-n. If it gets an array, it will therefore conclude that the relation is a 1-n type. In this very missile case, it is obviously a 1-n relation. That's why we named the relation "Missiles" and not "Missile".

## More and more

There is still a lot to tell about this library, but I don't have time anymore. So just some spoilers here, and you can check the code if something appeals you.

- You can inject your models in a nodeJS environnement and enjoy all theses great features server-side. Simply load the lib and check the inject() method.
- The API baseUrl can also be modified directly with the Api factory(), not only the ApiProvider provider. That means you can update the API you're calling at runtime.
- If you call an Api method and pass a fully qualified http address, it won't be concatenated to your Api baseUrl configuration, so it will work too.
- If, for some reason, your Api call does not return directly the data to be injected, but encapsulate them in a specfic key, you can add a `modelkey` configuration to indicate require-topmodel which key it should consider for model injection.

There is probably a ton of other things to discover. Just have a look to the code and don't blame me too much :P