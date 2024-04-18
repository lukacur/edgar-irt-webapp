import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobAvailableActionsComponent } from './job-available-actions/job-available-actions.component';
import { MatButtonModule } from '@angular/material/button';
import { Route, RouterModule } from '@angular/router';
import { JobOverviewComponent } from './job-overview/job-overview.component';
import { JobListItemComponent } from './job-overview/job-list-item/job-list-item.component';
import { MatIconModule, MatSelectModule } from '@angular/material';
import { JobStepItemComponent } from './job-overview/job-list-item/job-step-item/job-step-item.component';
import { JobExecutionComponent } from './job-execution/job-execution.component';
import { ReactiveFormsModule } from '@angular/forms';

import { provideAnimations } from '@angular/platform-browser/animations';

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
        component: JobExecutionComponent,
    },
]


@NgModule({
    declarations: [
        JobAvailableActionsComponent,
        JobOverviewComponent,
        JobListItemComponent,
        JobStepItemComponent,
        JobExecutionComponent
    ],
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        ReactiveFormsModule,
    ]
})
export class JobModule { }
