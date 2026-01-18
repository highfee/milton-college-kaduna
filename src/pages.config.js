import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdmissionForm from './pages/AdmissionForm';
import Gallery from './pages/Gallery';
import ManageTeachers from './pages/ManageTeachers';
import ManageStudents from './pages/ManageStudents';
import ManageSubjects from './pages/ManageSubjects';
import StaffRoles from './pages/StaffRoles';
import SchoolSettings from './pages/SchoolSettings';


export const PAGES = {
    "Home": Home,
    "Dashboard": Dashboard,
    "AdmissionForm": AdmissionForm,
    "Gallery": Gallery,
    "ManageTeachers": ManageTeachers,
    "ManageStudents": ManageStudents,
    "ManageSubjects": ManageSubjects,
    "StaffRoles": StaffRoles,
    "SchoolSettings": SchoolSettings,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};