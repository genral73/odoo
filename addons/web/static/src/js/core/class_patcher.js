odoo.define("web.class_patcher", function () {
    "use strict";

    function makePatchable(OriginalClass) {
        let unpatchList = [];
        class PatchableClass extends OriginalClass {}

        PatchableClass.patch = function(name, patch) {
            if (unpatchList.find(x => x.name === name)) {
                throw new Error(`Class ${OriginalClass.name} already has a patch ${name}`);
            }
            if (!this.hasOwnProperty('patch')) {
                throw new Error(`Class ${this.name} is not patchable`);
            }
            const SubClass = patch(this.__proto__);
            unpatchList.push({
                name: name,
                elem: this,
                prototype: this.prototype,
                origProto: this.__proto__,
                origPrototype: this.prototype.__proto__,
                patch: patch,
            });
            Object.setPrototypeOf(this, SubClass);
            Object.setPrototypeOf(this.prototype, SubClass.prototype);
        };

        PatchableClass.unpatch = function(name) {
            const toUnpatch = unpatchList.reverse();
            unpatchList = [];
            for (let unpatch of toUnpatch) {
                Object.setPrototypeOf(unpatch.elem, unpatch.origProto);
                Object.setPrototypeOf(unpatch.prototype, unpatch.origPrototype);
            }
            for (let u of toUnpatch.reverse()) {
                if (u.name !== name) {
                    PatchableClass.patch(u.name, u.patch);
                }
            }
        };
        return PatchableClass;
    }

    return makePatchable;
});
