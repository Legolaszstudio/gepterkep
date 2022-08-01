import Swal from 'sweetalert2';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

export function infoToast(info) {
    Toast.fire({
        icon: 'info',
        title: info,
    });
}

export function errorToast(info) {
    Toast.fire({
        icon: 'error',
        title: info,
    });
}

export function error(msg, info) {
    let content = msg;
    if (info != null) {
        content += "<br>Részletek: " + info;
    }
    Swal.fire({
        title: 'A manóba!',
        html: content,
        icon: 'error',
        confirmButtonText: 'Cool'
    });
}