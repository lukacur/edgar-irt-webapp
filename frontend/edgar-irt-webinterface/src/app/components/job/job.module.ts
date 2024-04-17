import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobAvailableActionsComponent } from './job-available-actions/job-available-actions.component';
import { MatButtonModule } from '@angular/material/button';
import { Route, RouterModule } from '@angular/router';
import { JobOverviewComponent } from './job-overview/job-overview.component';

const routes: Route[] = [
    {
        path: "",
        pathMatch: "full",
        component: JobAvailableActionsComponent,
    },
    {
        path: "overview",
        pathMatch: "full",
        component: JobOverviewComponent,
    },
    {
        path: "execution",
        pathMatch: "full",
        component: JobAvailableActionsComponent,
    },
]


@NgModule({
    declarations: [
        JobAvailableActionsComponent,
        JobOverviewComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        RouterModule,
        MatButtonModule,
    ]
})
export class JobModule { }
