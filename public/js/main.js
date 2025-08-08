document.addEventListener("DOMContentLoaded", () => {
    // Função para fechar alertas
    window.closeAlert = function(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.style.opacity = '0';
            setTimeout(() => alertElement.remove(), 500);
        }
    };

    // Lógica para o Modal de Adicionar Projeto
    const addProjectBtn = document.getElementById("addProjectBtn");
    const addProjectModal = document.getElementById("addProjectModal");
    if (addProjectBtn && addProjectModal) {
        const modalOverlay = addProjectModal.querySelector(".modal-overlay");
        const closeModalBtn = document.getElementById("closeAddModalBtn");

        function toggleAddModal() {
            addProjectModal.classList.toggle("opacity-0");
            addProjectModal.classList.toggle("pointer-events-none");
            document.body.classList.toggle("modal-active");
        }

        addProjectBtn.addEventListener("click", toggleAddModal);
        closeModalBtn.addEventListener("click", toggleAddModal);
        modalOverlay.addEventListener("click", toggleAddModal);
    }

    // Lógica para o Modal de Edição de Projeto
    const editProjectModal = document.getElementById("editProjectModal");
    if (editProjectModal) {
        const closeEditModalBtn = document.getElementById("closeEditModalBtn");
        const editModalOverlay = editProjectModal.querySelector(".modal-overlay");

        window.openEditModal = function(button) {
            const projectId = button.getAttribute('data-project-id');
            const title = button.getAttribute('data-title');
            const description = button.getAttribute('data-description');
            const categoryId = button.getAttribute('data-category');
            
            document.getElementById("editProjectForm").action = `/admin/edit-project/${projectId}`;
            document.getElementById("editTitle").value = title;
            document.getElementById("editDescription").value = description;
            document.getElementById("editCategory").value = categoryId;
            editProjectModal.classList.remove("opacity-0", "pointer-events-none");
            document.body.classList.add("modal-active");
        };

        function closeEditModal() {
            editProjectModal.classList.add("opacity-0", "pointer-events-none");
            document.body.classList.remove("modal-active");
        }

        closeEditModalBtn.addEventListener("click", closeEditModal);
        editModalOverlay.addEventListener("click", closeEditModal);
    }
});
