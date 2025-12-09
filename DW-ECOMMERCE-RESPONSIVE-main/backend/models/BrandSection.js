const mongoose = require('mongoose');

/**
 * BrandSection Model
 * Stores brand sections with multiple brands
 * Each brand has image, name, link, and discount info
 */
const BrandSectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    title: {
        type: String,
        trim: true
    },
    subtitle: {
        type: String,
        trim: true
    },
    brands: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        imageUrl: {
            type: String,
            required: true
        },
        imageFileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Media'
        },
        link: {
            type: String,
            trim: true
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        discountText: {
            type: String,
            trim: true,
            default: ''
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    displaySettings: {
        columns: {
            type: Number,
            default: 5,
            min: 1,
            max: 10
        },
        gap: {
            type: Number,
            default: 15,
            min: 0,
            max: 50
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    ordering: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

BrandSectionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('BrandSection', BrandSectionSchema);

