import pathlib
import re
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class StaticRegressionTests(unittest.TestCase):
    def test_all_pages_include_favicon(self):
        for page in ("index.html", "contact.html", "app.html"):
            html = (ROOT / page).read_text(encoding="utf-8")
            self.assertIn('rel="icon"', html, page)
            self.assertIn("favicon.jpeg", html, page)

    def test_admin_without_project_does_not_request_students_without_project_id(self):
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertRegex(
            app_js,
            re.compile(
                r"if\s*\(\s*currentRole\s*===\s*['\"]admin['\"]\s*&&\s*!currentProject\s*\)"
                r"[\s\S]*?students\s*=\s*\[\]",
                re.MULTILINE,
            ),
        )

    def test_admin_upload_console_has_three_upload_options(self):
        html = (ROOT / "app.html").read_text(encoding="utf-8")
        self.assertIn("Satish Upload Console", html)
        self.assertIn("Upload Student Excel", html)
        self.assertIn("Upload Individual Photos", html)
        self.assertIn("Upload ID Card Frame", html)

    def test_backend_accepts_requested_student_sheet_headers(self):
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        for expected in (
            "photo",
            "pic",
            "phonenumber",
            "phone number",
            "contact",
            "mother name",
            "father name",
            "dob",
            "class and section",
            "class section",
            "blood group",
            "address",
        ):
            self.assertIn(expected, main_py)

    def test_uploaded_images_are_saved_to_uploads_directory(self):
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        self.assertIn("UPLOAD_FOLDER", main_py)
        self.assertIn("save_upload_file", main_py)
        self.assertIn("uploads", main_py)
        self.assertIn("@app.route('/uploads/<path:filename>')", main_py)

    def test_contact_form_has_backend_endpoint(self):
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        contact_html = (ROOT / "contact.html").read_text(encoding="utf-8")
        self.assertIn("contact_messages", main_py)
        self.assertIn("@app.route('/api/contact', methods=['GET', 'POST'])", main_py)
        self.assertIn("submitContactForm", contact_html)

    def test_env_example_documents_production_settings_without_real_secrets(self):
        env_example = (ROOT / ".env.example").read_text(encoding="utf-8")
        self.assertIn("UPLOAD_FOLDER=uploads", env_example)
        self.assertIn("SERVER_PORT=10014", env_example)
        self.assertIn("SITE_DOMAIN=con.satishadagency.in", env_example)
        for secret in ("satadmin", "GOIV1VfzKrkUNQ", "u52_iGu4QX9lPI"):
            self.assertNotIn(secret, env_example)

    def test_staff_access_uses_generated_project_code_not_school_name(self):
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("access_code VARCHAR(64)", main_py)
        self.assertIn("generate_access_code", main_py)
        self.assertIn("WHERE access_code = %s", main_py)
        self.assertIn("Staff access code", app_js)

    def test_staff_portal_hides_admin_only_upload_design_and_export_controls(self):
        app_html = (ROOT / "app.html").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")

        self.assertIn(">School:</label>", app_html)
        self.assertNotIn("Project / School", app_html)
        self.assertIn("data-admin-only", app_html)
        self.assertIn("body.staff-mode #admin-tools", (ROOT / "styles.css").read_text(encoding="utf-8"))
        self.assertIn("document.body.classList.toggle('staff-mode'", app_js)
        self.assertIn("adminTools.classList.add('hidden')", app_js)
        self.assertIn("adminTools.style.display = 'none'", app_js)
        self.assertIn('id="staff-school-display"', app_html)
        self.assertIn('"All Student Records"', app_js)
        self.assertIn('"View and edit student database."', app_js)
        self.assertIn("staffSchoolDisplay.textContent = `School: ${userCtx.project_name}`", app_js)
        for expected in (
            "Only admins can upload student data and photos.",
            "Only admins can design ID cards.",
            "Only admins can download the master PDF.",
            "Only admins can download ID cards.",
        ):
            self.assertIn(expected, app_js)
        self.assertIn("if session[\"role\"] != \"admin\"", main_py)
        self.assertIn("styles.css?v=catalog-fast-", app_html)
        self.assertIn("app.js?v=catalog-fast-", app_html)
        self.assertIn('endpoint !== "/api/auth/login"', app_js)

    def test_student_access_uses_scoped_profile_fields_and_photo_id(self):
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        app_html = (ROOT / "app.html").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        for expected in (
            'id="student-school-input"',
            'id="student-class-input"',
            'id="student-section-input"',
            'id="student-roll-input"',
            'id="student-photo-id-input"',
        ):
            self.assertIn(expected, app_html)
        self.assertNotIn('id="student-id-input"', app_html)
        self.assertIn("bodyPayload.photo_id", app_js)
        self.assertIn("INNER JOIN projects", main_py)
        self.assertIn("photo_id VARCHAR(255)", main_py)
        self.assertIn("Enter the details you know", app_html)
        self.assertIn("School and at least one student detail are required.", main_py)
        self.assertNotIn('id="student-class-input" placeholder="e.g. 10" required', app_html)
        self.assertNotIn('id="student-roll-input" placeholder="e.g. 15" required', app_html)

    def test_catch_all_static_route_does_not_serve_arbitrary_files(self):
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        self.assertIn("PUBLIC_STATIC_FILES", main_py)
        self.assertNotIn("if os.path.exists(path):", main_py)

    def test_frontend_exports_support_uploaded_file_urls(self):
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("imageSourceToDataUrl", app_js)
        self.assertIn("const frameDataUrl = await imageSourceToDataUrl(idCardFrameData)", app_js)
        self.assertIn("await imageSourceToDataUrl(student.photo_data)", app_js)

    def test_correction_note_and_search_button_are_wired(self):
        app_html = (ROOT / "app.html").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        self.assertIn('onclick="filterTable()"', app_html)
        self.assertIn('id="edit-correction-note"', app_html)
        self.assertIn("correction_note", app_js)
        self.assertIn("correction_note", main_py)

    def test_database_view_has_sorting_pagination_archive_and_upload_reporting_controls(self):
        app_html = (ROOT / "app.html").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        for expected in (
            'data-sort="id"',
            'data-sort="name"',
            'data-sort="photo"',
            'id="pagination-controls"',
            'id="include-archived"',
            'id="upload-report"',
        ):
            self.assertIn(expected, app_html)
        for expected in (
            "setSort",
            "changePage",
            "changePageSize",
            "archiveStudent",
            "deleteStudent",
            "renderUploadReport",
            "serverSearchTimer",
        ):
            self.assertIn(expected, app_js)

    def test_admin_has_contact_inbox_and_access_code_management(self):
        app_html = (ROOT / "app.html").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")
        for expected in (
            'id="access-code-display"',
            'onclick="copyAccessCode()"',
            'onclick="regenerateAccessCode()"',
            'id="contact-messages-panel"',
            'id="contact-messages-body"',
        ):
            self.assertIn(expected, app_html)
        for expected in ("copyAccessCode", "regenerateAccessCode", "loadContactMessages", "renderContactMessages"):
            self.assertIn(expected, app_js)
        self.assertIn("@app.route('/api/contact', methods=['GET', 'POST'])", main_py)
        self.assertIn("/access-code/regenerate", main_py)

    def test_admin_catalog_editor_updates_public_homepage_galleries(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        app_html = (ROOT / "app.html").read_text(encoding="utf-8")
        app_js = (ROOT / "app.js").read_text(encoding="utf-8")
        main_py = (ROOT / "main.py").read_text(encoding="utf-8")

        self.assertEqual(index_html.count('data-catalog-key="'), 22)
        self.assertIn("fetch('/api/catalog')", index_html)
        self.assertIn("catalogImageOverrides[productKey]", index_html)
        self.assertIn('onclick="openCatalogModal()"', app_html)
        self.assertIn('id="catalogModal"', app_html)
        self.assertIn('id="catalog-items-list"', app_html)
        self.assertIn('id="catalog-image-input"', app_html)
        self.assertIn('id="catalog-save-status"', app_html)
        self.assertIn("Please select exactly 4 images.", app_js)
        self.assertIn("optimizeCatalogImage", app_js)
        self.assertIn("catalogImageMaxWidth", app_js)
        self.assertIn("canvas.toBlob", app_js)
        self.assertIn("image/jpeg", app_js)
        self.assertIn("new FormData()", app_js)
        self.assertIn("formData.append('images', file)", app_js)
        self.assertIn("Saving gallery images", app_js)
        self.assertIn('request.files.getlist("images")', main_py)
        self.assertIn("CREATE TABLE IF NOT EXISTS catalog_items", main_py)
        self.assertIn("@app.route('/api/catalog', methods=['GET'])", main_py)
        self.assertIn("@app.route('/api/catalog/<item_key>', methods=['PUT'])", main_py)


if __name__ == "__main__":
    unittest.main()
