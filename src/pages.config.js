import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AdmissionForm from './pages/AdmissionForm';
import Gallery from './pages/Gallery';
import ManageTeachers from './pages/ManageTeachers';
import ManageStudents from './pages/ManageStudents';
import ManageSubjects from './pages/ManageSubjects';
import StaffRoles from './pages/StaffRoles';
import SchoolSettings from './pages/SchoolSettings';
import ManageNewsletter from './pages/ManageNewsletter';
import ManageGallery from './pages/ManageGallery';
import EnterResults from './pages/EnterResults';
import ViewResults from './pages/ViewResults';
import AssignSubjects from './pages/AssignSubjects';
import AssignTeachers from './pages/AssignTeachers';
import AssignClasses from './pages/AssignClasses';
import ReviewResults from './pages/ReviewResults';
import ReviewClassResults from './pages/ReviewClassResults';


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
    "ManageNewsletter": ManageNewsletter,
    "ManageGallery": ManageGallery,
    "EnterResults": EnterResults,
    "ViewResults": ViewResults,
    "AssignSubjects": AssignSubjects,
    "AssignTeachers": AssignTeachers,
    "AssignClasses": AssignClasses,
    "ReviewResults": ReviewResults,
    "ReviewClassResults": ReviewClassResults,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};