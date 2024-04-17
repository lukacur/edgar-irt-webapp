import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JobAvailableActionsComponent } from './components/job/job-available-actions/job-available-actions.component.js';

const routes: Routes = [
    {
        path: "jobs",
        loadChildren: () => import('./components/job/job.module').then(m => m.JobModule),
    },
    {
        path: "statistics",
        redirectTo: "jobs"
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
