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
		var values = this.get(),
			instanceOptions = patches.instanceOptions(this);

		if (!instanceOptions.include) return values;

		instanceOptions.include.forEach(function(include) {
			var association = include.association,
				type = association.associationType,
				as = association.as,
				foreignKey;

			if (type == 'BelongsTo') {
				if (values[as][patches.associationTargetKey(association)] !== undefined) {
					foreignKey = patches.associationForeignKey(association);
					delete values[foreignKey];
				}
				values[as] = values[as].getValuesDedup();
			} else if (type == 'HasOne') {
				values[as] = values[as].getValuesDedup();

				if (association.source.primaryKeyCount == 1 && values[association.source.primaryKeyAttribute] !== undefined) {
					foreignKey = patches.associationForeignKey(association);
					delete values[as][foreignKey];
				}
			} else if (type == 'HasMany') {
				if (association.source.primaryKeyCount == 1 && values[association.source.primaryKeyAttribute] !== undefined) foreignKey = patches.associationForeignKey(association);

				values[as] = values[as].map(function(item) {
					item = item.getValuesDedup();
					if (foreignKey) delete item[foreignKey];
					return item;
				});
			} else if (type == 'BelongsToMany') {
				var throughAs = include.through.as,
					otherKey = association.otherKey,
					targetPrimaryKey;

				if (association.source.primaryKeyCount == 1 && values[association.source.primaryKeyAttribute] !== undefined) foreignKey = patches.associationForeignKey(association);
				if (association.target.primaryKeyCount == 1) targetPrimaryKey = association.target.primaryKeyAttribute;

				values[as] = values[as].map(function(item) {
					var throughItem = item[throughAs].get();
					if (foreignKey) delete throughItem[foreignKey];
					if (targetPrimaryKey && item[targetPrimaryKey] !== undefined) delete throughItem[otherKey];

					item = item.getValuesDedup();

					if (Object.keys(throughItem).length) {
						item[throughAs] = throughItem;
					} else {
						delete item[throughAs];
					}

					return item;
				});
			}
		});

		return values;
	};

	// return Sequelize
	return Sequelize;

	// support function
	function getValues(item, dedup) {
		// if a model instance, call its getValues() / getValuesDedup() method
		if (item instanceof Sequelize.Instance) return dedup ? item.getValuesDedup() : item.getValues();

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
