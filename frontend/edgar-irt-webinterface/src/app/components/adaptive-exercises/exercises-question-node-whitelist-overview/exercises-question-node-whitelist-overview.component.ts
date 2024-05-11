import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, firstValueFrom, map, Observable, Subscription, take, tap } from 'rxjs';
import { IExerciseDefinition } from 'src/app/models/adaptive-exercises/exercise-definition.model.js';
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
    exerciseDefinitions$: Observable<{ text: string, exDefinition: IExerciseDefinition }[]> = new BehaviorSubject([]);
    selectableNodes$: Observable<{ text: string, node: IEdgarNode }[]> = new BehaviorSubject([]);
    exerciseDefinitionWhitelistedNodes$: Observable<(IEdgarNode & { whitelisted_on: string })[]> =
        new BehaviorSubject([]);

    numberOfWhitelistedNodes: number = 0;

    readonly nodeSelectionForm = new FormGroup({
        selectedCourse: new FormControl<IEdgarCourse | null>(null, Validators.required),
        selectedExerciseDefinition: new FormControl<IExerciseDefinition | null>(null, Validators.required),

        toRemoveExerciseDefinitions: new FormControl<IExerciseDefinition[]>([]),

        selectedNodes: new FormControl<IEdgarNode[]>([]),
        toRemoveNodeIds: new FormControl<number[]>([]),
    });

    readonly subscriptions: Subscription[] = [];

    constructor(
        private adaptiveExercisesService: AdaptiveExercisesService,
        private edgarService: EdgarService,
    ) { }

    private reloadComponentData(keepCourse: false): void;
    private reloadComponentData(keepCourse: true, keepExerciseDefinition: boolean): void;
    private reloadComponentData(keepCourse: boolean, keepExerciseDefinition?: boolean): void {
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
            const selectedExerciseDefinitionControl = this.nodeSelectionForm.get('selectedExerciseDefinition');

            if (!keepExerciseDefinition) {
                this.exerciseDefinitions$ =
                    this.adaptiveExercisesService.getCourseExerciseDefinitions(courseControl!.value!.id)
                        .pipe(
                            take(1),
                            map(definitions =>
                                definitions.map(exDefinition => {
                                    return {
                                        text: exDefinition.exercise_name,
                                        exDefinition
                                    };
                                })
                            )
                        );

                selectedExerciseDefinitionControl?.setValue(null);
            } else if ((selectedExerciseDefinitionControl?.value ?? null) !== null) {
                this.exerciseDefinitionWhitelistedNodes$ =
                    this.adaptiveExercisesService.getExerciseDefinitionNodeWhitelist(
                        selectedExerciseDefinitionControl!.value!.id
                    ).pipe(tap(nodes => this.numberOfWhitelistedNodes = nodes.length));
            }
        }

        this.nodeSelectionForm.get('toRemoveExerciseDefinitions')?.setValue([]);
        console.log(this.nodeSelectionForm.get('toRemoveExerciseDefinitions'));

        this.nodeSelectionForm.get('selectedNodes')?.setValue([]);
        this.nodeSelectionForm.get('toRemoveNodeIds')?.setValue([]);
    }

    ngOnInit(): void {
        this.reloadComponentData(false);

        const selectedCourseControl = this.nodeSelectionForm.get('selectedCourse');
        const selectedExerciseDefinitionControl = this.nodeSelectionForm.get('selectedExerciseDefinition');
        if (selectedCourseControl !== null && selectedExerciseDefinitionControl !== null) {
            this.subscriptions.push(
                selectedCourseControl.valueChanges
                    .subscribe(crs => {
                        if (crs !== null) {
                            this.exerciseDefinitions$ =
                                this.adaptiveExercisesService.getCourseExerciseDefinitions(crs.id)
                                    .pipe(
                                        take(1),
                                        map(definitions =>
                                            definitions.map(exDefinition => {
                                                return {
                                                    text: exDefinition.exercise_name,
                                                    exDefinition
                                                };
                                            })
                                        )
                                    );
                        }
                    }),

                selectedExerciseDefinitionControl.valueChanges
                    .subscribe(exDef => {
                        if (exDef !== null) {
                            this.selectableNodes$ =
                                this.adaptiveExercisesService.getExerciseDefinitionWhitelistableQuestionNodes(exDef.id)
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

                            this.exerciseDefinitionWhitelistedNodes$ =
                                this.adaptiveExercisesService.getExerciseDefinitionNodeWhitelist(exDef.id)
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

    exerciseDefinitionEqualityCheck(exer1: IExerciseDefinition, exer2: IExerciseDefinition): boolean {
        return exer1.id === exer2.id;
    }

    removeSelectedExerciseDefinitions() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.removeExerciseDefinitions(
            formValue.toRemoveExerciseDefinitions ?? []
        ).subscribe(() => {
            window.alert("Successfully removed selected exercise definitions");
            this.reloadComponentData(true, false);
        });
    }


    @ViewChild("newExerNameInput")
    newExerNameInput?: ElementRef<HTMLInputElement> | null = null;

    async defineNewExercise(newExerciseDefinitionName: string | null) {
        if (newExerciseDefinitionName === null || newExerciseDefinitionName.length < 5) {
            window.alert("Exercise definition must have a name set and the name must contain at least 5 characters");
            return;
        }

        if (
            (await firstValueFrom(this.exerciseDefinitions$))
                .some(el => el.exDefinition.exercise_name === newExerciseDefinitionName)
        ) {
            window.alert("New exercise name must be unique");
            return;
        }

        const course = this.nodeSelectionForm.get('selectedCourse')?.value;
        if ((course ?? null) === null) {
            window.alert("A course must be selected before defining a new exercise");
            return;
        }
        
        this.adaptiveExercisesService.createExerciseDefinition(course!.id, newExerciseDefinitionName)
            .subscribe(() => {
                window.alert("New exercise definition successfully created");
                if ((this.newExerNameInput ?? null) !== null) {
                    this.newExerNameInput!.nativeElement.value = "";
                }

                this.reloadComponentData(true, false);
                /*this.exerciseDefinitions$
                    .pipe(
                        tap(exDefs => {
                            const exDef = exDefs
                                .map(def => def.exDefinition)
                                .find(def => def.exercise_name === newExerciseDefinitionName);
    
                            if ((exDef ?? null) !== null) {
                                this.nodeSelectionForm.get("selectedExerciseDefinition")?.setValue(exDef ?? null);
                            }
    
                            console.log(this.nodeSelectionForm.get("selectedExerciseDefinition"));
                        })
                    );*/
            });
    }


    whitelistSelectedNodes() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.addQuestionNodesToWhitelist(
            formValue.selectedNodes
                ?.map(
                    nd => ({ id_exercise_definiton: formValue.selectedExerciseDefinition!.id, id_node: nd.id! })
                ) ?? []
        ).subscribe(() => {
            window.alert("Selected nodes successfully whitelisted");
            this.reloadComponentData(true, true);
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
        this.exerciseDefinitionWhitelistedNodes$
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

        this.adaptiveExercisesService.removeQuestionNodesFromWhitelist(
            formValue.toRemoveNodeIds
                ?.map(
                    ndId => ({ id_exercise_definiton: formValue.selectedExerciseDefinition!.id, id_node: ndId })
                ) ?? []
        ).subscribe(() => {
            window.alert("Successfully removed selected nodes from whitelist");
            this.reloadComponentData(true, true);
        });
    }
}
