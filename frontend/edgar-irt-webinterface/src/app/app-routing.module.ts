import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: "jobs",
        loadChildren: () => import('./components/job/job.module').then(m => m.JobModule),
    },
    {
        path: "statistics",
        loadChildren: () => import('./components/statistics/statistics.module').then(m => m.StatisticsModule),
    },
    {
        path: "adaptive-exercises",
        loadChildren:
            () => import('./components/adaptive-exercises/adaptive-exercises.module')
                .then(m => m.AdaptiveExercisesModule),
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
