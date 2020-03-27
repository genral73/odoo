odoo.define('mail.messaging.component_hook.useDragVisibleDropZone', function (require) {
'use strict';

const { useRef, useState, onMounted, onWillUnmount } = owl.hooks;

/**
 * This hook handle the visibility of the dropzone based on drag & drop events.
 * It needs a ref to a dropzone, so you need to specify a t-ref="dropzone" in
 * the template of your component.
 *
 * @return {Object}
 */
function useDragVisibleDropZone() {
    /**
     * Determine whether the drop zone should be visible or not.
     * Note that this is an observed value, and primitive types such as
     * boolean cannot be observed, hence this is an object with boolean
     * value accessible from `.value`
     */
    const isVisible = useState({ value: false });
    const dropzoneRef = useRef('dropzone');

    /**
     * Counts how many drag enter/leave happened globally. This is the only
     * way to know if a file has been dragged out of the browser window.
     */
    let dragCount = 0;

    // COMPONENTS HOOKS
    onMounted(() => {
        document.addEventListener('dragenter', _onDragenterListener, true);
        document.addEventListener('dragleave', _onDragleaveListener, true);
        document.addEventListener('drop', _onDropListener, true);
    });

    onWillUnmount(() => {
        document.removeEventListener('dragenter', _onDragenterListener, true);
        document.removeEventListener('dragleave', _onDragleaveListener, true);
        document.removeEventListener('drop', _onDropListener, true);
    });

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Shows the dropzone when entering the browser window, to let the user know
     * where he can drop its file.
     * Avoids changing state when entering inner dropzones.
     *
     * @private
     * @param {DragEvent} ev
     */
    function _onDragenterListener(ev) {
        if (dragCount === 0) {
            isVisible.value = true;
        }
        dragCount++;
    }

    /**
     * @private
     * @param {DragEvent} ev
     */
    function _onDragleaveListener(ev) {
        dragCount--;
        if (dragCount === 0) {
            isVisible.value = false;
        }
    }

    /**
     * @private
     * @param {DragEvent} ev
     */
    function _onDropListener(ev) {
        dragCount = 0;
        if (!dropzoneRef.comp.contains(ev.target)) {
            isVisible.value = false;
        }
    }

    return isVisible;
}

return useDragVisibleDropZone;

});
