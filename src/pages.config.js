/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminPortal from './pages/AdminPortal';
import AdmissionForm from './pages/AdmissionForm';
import AssignClasses from './pages/AssignClasses';
import AssignSubjects from './pages/AssignSubjects';
import AssignTeachers from './pages/AssignTeachers';
import Dashboard from './pages/Dashboard';
import EnterResults from './pages/EnterResults';
import Gallery from './pages/Gallery';
import GenerateReportCards from './pages/GenerateReportCards';
import Home from './pages/Home';
import ManageAssignments from './pages/ManageAssignments';
import ManageCBT from './pages/ManageCBT';
import ManageCalendar from './pages/ManageCalendar';
import ManageGallery from './pages/ManageGallery';
import ManageNewsletter from './pages/ManageNewsletter';
import ManageParents from './pages/ManageParents';
import ManageStudents from './pages/ManageStudents';
import ManageSubjects from './pages/ManageSubjects';
import ManageTeachers from './pages/ManageTeachers';
import ManageTimetable from './pages/ManageTimetable';
import ParentPortal from './pages/ParentPortal';
import PortalLogin from './pages/PortalLogin';
import Reports from './pages/Reports';
import ReviewClassResults from './pages/ReviewClassResults';
import ReviewResults from './pages/ReviewResults';
import SchoolSettings from './pages/SchoolSettings';
import StaffProfile from './pages/StaffProfile';
import StaffRoles from './pages/StaffRoles';
import StudentPortal from './pages/StudentPortal';
import StudentProfile from './pages/StudentProfile';
import TakeCBT from './pages/TakeCBT';
import TeacherPortal from './pages/TeacherPortal';
import ViewCBTResults from './pages/ViewCBTResults';
import ViewResults from './pages/ViewResults';
import HeadTeacherPortal from './pages/HeadTeacherPortal';


export const PAGES = {
    "AdminPortal": AdminPortal,
    "AdmissionForm": AdmissionForm,
    "AssignClasses": AssignClasses,
    "AssignSubjects": AssignSubjects,
    "AssignTeachers": AssignTeachers,
    "Dashboard": Dashboard,
    "EnterResults": EnterResults,
    "Gallery": Gallery,
    "GenerateReportCards": GenerateReportCards,
    "Home": Home,
    "ManageAssignments": ManageAssignments,
    "ManageCBT": ManageCBT,
    "ManageCalendar": ManageCalendar,
    "ManageGallery": ManageGallery,
    "ManageNewsletter": ManageNewsletter,
    "ManageParents": ManageParents,
    "ManageStudents": ManageStudents,
    "ManageSubjects": ManageSubjects,
    "ManageTeachers": ManageTeachers,
    "ManageTimetable": ManageTimetable,
    "ParentPortal": ParentPortal,
    "PortalLogin": PortalLogin,
    "Reports": Reports,
    "ReviewClassResults": ReviewClassResults,
    "ReviewResults": ReviewResults,
    "SchoolSettings": SchoolSettings,
    "StaffProfile": StaffProfile,
    "StaffRoles": StaffRoles,
    "StudentPortal": StudentPortal,
    "StudentProfile": StudentProfile,
    "TakeCBT": TakeCBT,
    "TeacherPortal": TeacherPortal,
    "ViewCBTResults": ViewCBTResults,
    "ViewResults": ViewResults,
    "HeadTeacherPortal": HeadTeacherPortal,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};