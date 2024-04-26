import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, map, Observable, Subscription, take, tap } from 'rxjs';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { IEdgarNode } from 'src/app/models/edgar/node.model';
import { AdaptiveExercisesService } from 'src/app/services/adaptive-exercises.service';
import { EdgarService } from 'src/app/services/edgar.service';

@Component({
    selector: 'app-question-node-whitelist-overview',
    templateUrl: './exercises-question-node-whitelist-overview.component.html',
})
export class ExercisesQuestionNodeWhitelistOverviewComponent implements OnInit, OnDestroy {
    courses$: Observable<{ text: string, course: IEdgarCourse }[]> = new BehaviorSubject([]);
    selectableNodes$: Observable<{ text: string, node: IEdgarNode }[]> = new BehaviorSubject([]);
    courseWhitelistedNodes$: Observable<(IEdgarNode & { whitelisted_on: string })[]> =
        new BehaviorSubject([]);

    numberOfWhitelistedNodes: number = 0;

    readonly nodeSelectionForm = new FormGroup({
        selectedCourse: new FormControl<IEdgarCourse | null>(null, Validators.required),
        selectedNodes: new FormControl<IEdgarNode[]>([]),
        toRemoveNodeIds: new FormControl<number[]>([]),
    });

    readonly subscriptions: Subscription[] = [];

    constructor(
        private adaptiveExercisesService: AdaptiveExercisesService,
        private edgarService: EdgarService,
    ) { }

    private reloadComponentData(keepCourse: boolean) {
        const courseControl = this.nodeSelectionForm.get('selectedCourse');

        if (!keepCourse) {
            this.courses$ = this.edgarService.getCourses()
                .pipe(
                    map(courses =>
                        courses.map(course => {
                            return {
                                text: `(${course.course_acronym}) ${course.course_name} - ${course.ects_credits} ECTS`,
                                course
                            };
                        })
                    )
                );

            courseControl?.setValue(null);
        } else if ((courseControl?.value ?? null) !== null) {
            this.courseWhitelistedNodes$ =
                this.adaptiveExercisesService.getCourseQuestionNodeWhitelist(courseControl!.value!.id)
                    .pipe(tap(nodes => this.numberOfWhitelistedNodes = nodes.length));
        }

        this.nodeSelectionForm.get('selectedNodes')?.setValue([]);
        this.nodeSelectionForm.get('toRemoveNodeIds')?.setValue([]);
    }

    ngOnInit(): void {
        this.reloadComponentData(false);

        const selectedCourseControl = this.nodeSelectionForm.get('selectedCourse');
        if (selectedCourseControl !== null) {
            this.subscriptions.push(
                selectedCourseControl.valueChanges
                    .subscribe(crs => {
                        if (crs !== null) {
                            this.selectableNodes$ =
                                this.adaptiveExercisesService.getCourseWhitelistableQuestionNodes(crs.id)
                                    .pipe(
                                        map(nodes => {
                                            return nodes.map(node => {
                                                return {
                                                    text: `(${node.node_type_name}) - ${node.node_name}`,
                                                    node
                                                };
                                            });
                                        })
                                    );

                            this.courseWhitelistedNodes$ =
                                this.adaptiveExercisesService.getCourseQuestionNodeWhitelist(crs.id)
                                    .pipe(tap(nodes => this.numberOfWhitelistedNodes = nodes.length));

                        }
                    })
            );
        }


        const selectedNodesControl = this.nodeSelectionForm.get('selectedNodes');
        if (selectedNodesControl !== null) {
            this.subscriptions.push(
                selectedNodesControl.valueChanges
                    .subscribe(_ => {
                        this.nodeSelectionForm.markAsDirty();
                    })
            );
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    whitelistSelectedNodes() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.addQuestionNodesToWhitelist(
            formValue.selectedNodes?.map(nd => ({ id_course: formValue.selectedCourse!.id, id_node: nd.id! })) ?? []
        ).subscribe(() => {
            window.alert("Selected nodes successfully whitelisted");
            this.reloadComponentData(true);
        });
    }


    removalSelectionStatus(): "indeterminate" | "full" | "empty" {
        const toRemoveIdsCount = this.nodeSelectionForm.get('toRemoveNodeIds')?.value?.length ?? 0;

        return (toRemoveIdsCount > 0 && toRemoveIdsCount < this.numberOfWhitelistedNodes) ?
            "indeterminate" :
            (
                (toRemoveIdsCount === this.numberOfWhitelistedNodes && toRemoveIdsCount !== 0) ?
                    "full" :
                    "empty"
            );
    }

    setRemovalSelectionToAllNodes(selected: boolean) {
        this.courseWhitelistedNodes$
            .pipe(take(1))
            .subscribe(nodes => {
                this.nodeSelectionForm.get('toRemoveNodeIds')
                    ?.setValue(selected ? nodes.map(nd => nd.id) : []);
            });
    }

    toggleNodeForRemoval(remove: boolean, nodeId: number) {
        const valArr = this.nodeSelectionForm.get('toRemoveNodeIds')?.value ?? [];
        const idx = valArr.indexOf(nodeId);

        if (idx === -1) {
            valArr.push(nodeId);
        } else if (remove) {
            valArr.splice(idx, 1);
        }

        this.nodeSelectionForm.get('toRemoveNodeIds')?.setValue(valArr);
    }

    removeSelectedNodes() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.removeQuestionNodesFromWhitelist(formValue.toRemoveNodeIds ?? [])
            .subscribe(() => {
                window.alert("Successfully removed selected nodes from whitelist");
                this.reloadComponentData(true);
            });
    }
}
