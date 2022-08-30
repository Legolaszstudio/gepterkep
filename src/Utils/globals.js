import Swal from 'sweetalert2';

/**
 * Variables available all through electron.js
 */
export const globals = {
    computerData: null,
};

/** Allow swal usage from external code */
window.cSwal = Swal;
export default globals;