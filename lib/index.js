// --------------------
// Sequelize values
// --------------------

// modules
var _ = require('lodash');

// imports
var patchesFn = require('./patches');

// exports
module.exports = function(Sequelize) {
	if (!Sequelize) Sequelize = require('sequelize');

	var patches = patchesFn(Sequelize);

	// add getValues methods

	// gets values of supplied object/array, including values of nested associations
	// run on Sequelize
	Sequelize.getValues = function(item) {
		return getValues(item);
	};

	// gets values of instance, including values of nested associations
	// run on a model instance
	Sequelize.Instance.prototype.getValues = function() {
		return this.get({plain: true});
	};

	// as getValuesSequelize above except:
	// where an associated object has been eager-loaded and includes its ID, removes the ID field leading to that object
	// to remove duplicated information
	// e.g. { userId: 1, user: { id: 1 } } -> { user: { id: 1 } }
	Sequelize.getValuesDedup = function(item) {
		return getValues(item, true);
	};

	// as getValuesInstance above except:
	// where an associated object has been eager-loaded and includes its ID, removes the ID field leading to that object
	// to remove duplicated information
	// e.g. { userId: 1, user: { id: 1 } } -> { user: { id: 1 } }
	Sequelize.Instance.prototype.getValuesDedup = function() {
		// remove unnecessary ID fields
		var values = this.get();

		_.forIn(values, function(attribute, attributeName) {
			if (!(attribute instanceof Sequelize.Instance)) return;

			var model = attribute.__proto__.Model; // jshint ignore:line
			if (model.primaryKeyAttributes.length != 1) return;

			var key = model.primaryKeyAttributes[0];
			if (attribute.dataValues[key] !== undefined) delete values[attributeName + Sequelize.Utils.uppercaseFirst(key)];
		}.bind(this));

		// identify unnecessary ID fields in through tables
		var throughs = {},
			instanceOptions = patches.instanceOptions(this);

		if (instanceOptions.include) {
			_.forEach(instanceOptions.include, function(include) {
				if (include.through && include.through._pseudo) {
					throughs[include.as] = {
						model: include.through.as,
						field1: include.association.identifier,
						field2: include.association.foreignIdentifier
					};
				}
			});
		}

		// get values
		return _.mapValues(values, function(attribute, attributeName) {
			if (Array.isArray(attribute)) {
				var thisValues = attribute.map(function(item) {
					return item.getValuesDedup();
				});

				// remove unnecessary ID fields in through table
				var through = throughs[attributeName];
				if (through) {
					thisValues.forEach(function(item) {
						var throughItem = item[through.model];
						delete throughItem[through.field1];
						delete throughItem[through.field2];
						if (Object.keys(throughItem).length == 0) delete item[through.model];
					});
				}

				return thisValues;
			}

			if (attribute instanceof Sequelize.Instance) return attribute.getValuesDedup();

			return this.get(attributeName);
		}.bind(this));
	};

	// return Sequelize
	return Sequelize;

	// support function
	function getValues(item, dedup) {
		// if item undefined, return undefined
		if (!item) return item;

		// if a model instance, call its getValues() method
		if (item instanceof Sequelize.Instance) {
			if (dedup) {
				return item.getValuesDedup();
			} else {
				return item.getValues();
			}
		}

		// if array, loop through each item getting values
		if (Array.isArray(item)) {
			return item.map(function(thisItem) {
				return getValues(thisItem, dedup);
			});
		}

		// if is an object, loop through each attribute getting values
		if (_.isPlainObject(item)) {
			return _.mapValues(item, function(value) {
				return getValues(value, dedup);
			});
		}

		// is not a sequelize instance, an array or an object - return it unchanged
		return item;
	}
};
