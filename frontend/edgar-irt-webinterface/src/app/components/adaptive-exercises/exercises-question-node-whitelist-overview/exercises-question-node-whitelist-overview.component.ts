import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, map, Observable, Subscription, take, tap } from 'rxjs';
import { IExerciseDefinition } from 'src/app/models/adaptive-exercises/exercise-definition.model';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { IEdgarNode } from 'src/app/models/edgar/node.model';
import { INodeQuestionClass } from 'src/app/models/exercise-definition/node-question-class.model';
import { AdaptiveExercisesService } from 'src/app/services/adaptive-exercises.service';
import { EdgarService } from 'src/app/services/edgar.service';
import { ExerciseDefinitionService } from 'src/app/services/exercise-definition.service';
import { QuestionIrtClassification, QuestionUtil } from 'src/app/util/question.util';

type CourseQuestionClassInfo = { qClass?: string, qClassCount?: number };
type ReducedQuestionDifficultyInfo = {
    idQuestion: number;
    questionText: string;
    baseDifficulties: QuestionIrtClassification[];
    overrideDifficulty: QuestionIrtClassification | null;
    isOverride: boolean;
};

@Component({
    selector: 'app-question-node-whitelist-overview',
    templateUrl: './exercises-question-node-whitelist-overview.component.html',
})
export class ExercisesQuestionNodeWhitelistOverviewComponent implements OnInit, OnDestroy {
    readonly QUtil = QuestionUtil;

    courses$: Observable<{ text: string, course: IEdgarCourse }[]> = new BehaviorSubject([]);
    exerciseDefinitions$: Observable<{ text: string, exDefinition: IExerciseDefinition }[]> = new BehaviorSubject([]);
    selectableNodes$: Observable<{ text: string, node: IEdgarNode }[]> = new BehaviorSubject([]);
    private readonly exerciseQuestionDifficultyInfo$ = new BehaviorSubject<ReducedQuestionDifficultyInfo[]>([]);
    private readonly classFilteredExerciseQuestionDifficultyInfo$ =
        new BehaviorSubject<ReducedQuestionDifficultyInfo[]>([]);

    filterText: string = "";
    searchPerformed: boolean = false;
    readonly filteredExerciseQuestionDifficultyInfo$ = new BehaviorSubject<ReducedQuestionDifficultyInfo[]>([]);

    exerciseDefinitionWhitelistedNodes$: Observable<(IEdgarNode & { whitelisted_on: string })[]> =
        new BehaviorSubject([]);

    private byNodeQuestionClasses$: Observable<INodeQuestionClass[]> = new BehaviorSubject([]);

    nodeQuestionClasses: INodeQuestionClass[] = [];
    courseQuestionClasses: CourseQuestionClassInfo[] = [];

    readonly questionClasses = QuestionUtil.getAvailableClasses();
    readonly settableQuestionClasses = QuestionUtil.getSettableClasses();
    readonly questionClassColors = QuestionUtil.questionClassHexColors();

    numberOfWhitelistedNodes: number = 0;

    readonly nodeSelectionForm = new FormGroup({
        selectedCourse: new FormControl<IEdgarCourse | null>(null, Validators.required),
        selectedExerciseDefinition: new FormControl<IExerciseDefinition | null>(null, Validators.required),

        toRemoveExerciseDefinitions: new FormControl<IExerciseDefinition[]>([]),

        selectedNodes: new FormControl<IEdgarNode[]>([]),
        toRemoveNodeIds: new FormControl<number[]>([]),

        progressionCustomization: new FormGroup({
            correctAnswersToUpgrade: new FormControl<number>(3, [Validators.min(1)]),
            incorrectAnswersToDowngrade: new FormControl<number>(2, [Validators.min(1)]),
            skippedQuestionsToDowngrade: new FormControl<number>(5, [Validators.min(1)]),
        }),
    });
    
    readonly questionDifficultyOverridesMap = new Map<number, QuestionIrtClassification | null>();

    readonly subscriptions: Subscription[] = [];

    constructor(
        private adaptiveExercisesService: AdaptiveExercisesService,
        private exerciseDefinitionService: ExerciseDefinitionService,
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
                const obs = this.adaptiveExercisesService.getCourseExerciseDefinitions(courseControl!.value!.id)
                    .pipe(take(1));
                
                this.exerciseDefinitions$ = obs.pipe(map(definitions =>
                    definitions.map(exDefinition => {
                        return {
                            text: exDefinition.exercise_name,
                            exDefinition
                        };
                    })));
                
                obs
                    .subscribe(defs => {
                        selectedExerciseDefinitionControl?.setValue(
                            defs.find(el => el.id === selectedExerciseDefinitionControl.value?.id) ?? null
                        );
                    });

                this.exerciseDefinitionWhitelistedNodes$ =
                    this.adaptiveExercisesService.getExerciseDefinitionNodeWhitelist(
                        selectedExerciseDefinitionControl!.value!.id
                    ).pipe(tap(nodes => this.numberOfWhitelistedNodes = nodes.length));

                    this.byNodeQuestionClasses$ =
                        this.exerciseDefinitionService.getQuestionClassesForDefinition(
                            selectedExerciseDefinitionControl!.value!.id
                        ).pipe(
                            tap(qcls => {
                                this.nodeQuestionClasses = qcls;
                                this.courseQuestionClasses = qcls.reduce(
                                    (acc, el) => {
                                        let found = false;
                                        for (const entry of acc) {
                                            if (entry.qClass === (el.class_name ?? "unclassified")) {
                                                entry.qClassCount! += el.number_of_questions;
                                                found = true;
                                                break;
                                            }
                                        }

                                        if (!found) {
                                            const obj: CourseQuestionClassInfo = {
                                                qClass: (el.class_name ?? "unclassified"),
                                                qClassCount: el.number_of_questions
                                            };
                                            acc.push(obj);
                                        }

                                        return acc;
                                    },
                                    [] as CourseQuestionClassInfo[]
                                );
                            }),
                        );

                    this.subscriptions.push(this.byNodeQuestionClasses$.subscribe());
            }
        }

        this.nodeSelectionForm.get('toRemoveExerciseDefinitions')?.setValue([]);

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

                        selectedExerciseDefinitionControl.setValue(null);
                    }),

                selectedExerciseDefinitionControl.valueChanges
                    .subscribe(exDef => {
                        this.questionDifficultyOverridesMap.clear();
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

                            this.exerciseDefinitionService.getQuestionDifficultyInformation(exDef.id)
                                .pipe(
                                    take(1),
                                    map(qdis => {
                                        const map = new Map<number, ReducedQuestionDifficultyInfo>();

                                        for (const qdi of qdis) {
                                            if (!map.has(qdi.id_question)) {
                                                const diffictsArr: QuestionIrtClassification[] = [];
                                                if (!qdi.is_override && qdi.question_difficulty !== null) {
                                                    diffictsArr.push(qdi.question_difficulty);
                                                }

                                                map.set(
                                                    qdi.id_question,
                                                    {
                                                        idQuestion: qdi.id_question,
                                                        questionText: qdi.question_text,
                                                        isOverride: qdi.is_override,
                                                        baseDifficulties: diffictsArr,
                                                        overrideDifficulty: qdi.question_difficulty_override,
                                                    }
                                                );
                                            } else {
                                                const oldInfo = map.get(qdi.id_question);

                                                if (qdi.question_difficulty !== null) {
                                                    oldInfo?.baseDifficulties?.push(
                                                        qdi.question_difficulty!
                                                    );
                                                }
                                            }
                                        }

                                        const retArr: ReducedQuestionDifficultyInfo[] = [];
                                        for (const val of map.values()) {
                                            retArr.push(val);
                                        }

                                        return retArr;
                                    }),
                                ).subscribe(qdis => {
                                    this.exerciseQuestionDifficultyInfo$.next(qdis);
                                    this.classFilteredExerciseQuestionDifficultyInfo$.next(qdis);
                                    this.filteredExerciseQuestionDifficultyInfo$.next(qdis);
                                });

                            this.byNodeQuestionClasses$ =
                                this.exerciseDefinitionService.getQuestionClassesForDefinition(exDef.id)
                                    .pipe(
                                        tap(qcls => {
                                            this.nodeQuestionClasses = qcls;
                                            this.courseQuestionClasses = qcls.reduce(
                                                (acc, el) => {
                                                    let found = false;
                                                    for (const entry of acc) {
                                                        if (entry.qClass === (el.class_name ?? "unclassified")) {
                                                            entry.qClassCount! += el.number_of_questions;
                                                            found = true;
                                                            break;
                                                        }
                                                    }
            
                                                    if (!found) {
                                                        const obj: CourseQuestionClassInfo = {
                                                            qClass: (el.class_name ?? "unclassified"),
                                                            qClassCount: el.number_of_questions
                                                        };
                                                        acc.push(obj);
                                                    }
            
                                                    return acc;
                                                },
                                                [] as CourseQuestionClassInfo[]
                                            );
                                        }),
                                    );

                            this.nodeSelectionForm.get('progressionCustomization')?.patchValue({
                                correctAnswersToUpgrade: exDef.correct_answers_to_upgrade,
                                incorrectAnswersToDowngrade: exDef.incorrect_answers_to_downgrade,
                                skippedQuestionsToDowngrade: exDef.skipped_questions_to_downgrade,
                            });

                            this.subscriptions.push(this.byNodeQuestionClasses$.subscribe());
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

    getExerciseTotalQuestionCount(): number {
        return this.courseQuestionClasses.reduce((acc, el) => acc += (el.qClassCount ?? 0), 0);
    }

    getNodeTotalQuestions(idNode: number): number {
        return this.nodeQuestionClasses
            .filter(nqc => nqc.id_node === idNode)
            .reduce((acc, el) => acc += el.number_of_questions, 0);
    }
    
    getNodeQuestionClassCount(idNode: number, questionClass: string): number {
        return this.nodeQuestionClasses
            .filter(
                nqc => nqc.id_node === idNode && (nqc.class_name ?? "unclassified") === questionClass
            )[0]?.number_of_questions ?? 0;
    }


    updateProgressionInformation() {
        const formData = this.nodeSelectionForm.getRawValue();
        if ((formData.selectedExerciseDefinition ?? null) === null) {
            window.alert("You have to select an exercise definition before updateing progression information");
            return;
        }

        this.exerciseDefinitionService.updateProgressionInformation(
            formData.selectedExerciseDefinition!.id,
            formData.progressionCustomization,
        ).subscribe(() => {
            window.alert("Successfully updated exercise progression information");

            this.reloadComponentData(true, true);
        });
    }

    doFilterQuestionsByClass(qClass: string) {
        if (!this.questionClasses.includes(qClass as QuestionIrtClassification) || qClass === "") {
            this.exerciseQuestionDifficultyInfo$
                .pipe(take(1))
                .subscribe(rqdis => {
                    this.filteredExerciseQuestionDifficultyInfo$.next(rqdis);
                    this.classFilteredExerciseQuestionDifficultyInfo$.next(rqdis);
                });
            return;
        }

        this.exerciseQuestionDifficultyInfo$.pipe(
            take(1),
            map(els =>
                els.filter(
                    el => el.isOverride && el.overrideDifficulty === qClass ||
                        !el.isOverride && (
                            el.baseDifficulties.length === 0 && qClass === 'unclassified' ||
                            el.baseDifficulties.includes(qClass as QuestionIrtClassification)
                        )
                )
            ),
        ).subscribe(els => {
            this.filteredExerciseQuestionDifficultyInfo$.next(els);
            this.classFilteredExerciseQuestionDifficultyInfo$.next(els);
        });
    }

    doFilterQuestions(event: KeyboardEvent | null) {
        const filterBase$ = this.classFilteredExerciseQuestionDifficultyInfo$;

        if (this.filterText.trim() === "") {
            filterBase$
                .pipe(take(1))
                .subscribe(els => this.filteredExerciseQuestionDifficultyInfo$.next(els));
            return;
        }

        if (event !== null) {
            this.searchPerformed = false;
        }

        if (event !== null && event.key.toLocaleLowerCase() !== 'enter' || this.searchPerformed) {
            return;
        }

        filterBase$.pipe(
            take(1),
            map(els =>
                els.filter(el => `${el.idQuestion};${el.questionText}`.includes(this.filterText))
            ),
        ).subscribe(els => this.filteredExerciseQuestionDifficultyInfo$.next(els));

        this.searchPerformed = true;
    }

    getTableRowCountInfoText$(): Observable<string> {
        return this.filteredExerciseQuestionDifficultyInfo$
            .pipe(
                map(rqdis => ({
                    rows: rqdis.length,
                    classifications: rqdis.reduce(
                        (acc, el) => acc + ((el.isOverride) ? 1 : (el.baseDifficulties?.length ?? 0)),
                        0
                    ),
                    unclassified: rqdis.reduce(
                        (acc, el) => acc + ((el.isOverride) ? 0 : (el.baseDifficulties.length === 0 ? 1 : 0)),
                        0
                    ),
                })),
                map(textInfo =>
                    `(rows: ${textInfo.rows}; classifications: ${textInfo.classifications}; ` +
                    `unclassified: ${textInfo.unclassified})`
                ),
            );
    }

    confirmQuestionClassOverrides() {
        if (this.questionDifficultyOverridesMap.size === 0) {
            window.alert("No new question overrides were set.");
            return;
        }

        if ((this.nodeSelectionForm.get('selectedExerciseDefinition')?.value ?? null) === null) {
            window.alert("An exercise definition must be selected before proceeding to question difficulty override");
            return;
        }

        const idExerciseDefinition = this.nodeSelectionForm.get('selectedExerciseDefinition')!.value!.id;
        const overrides: { idQuestion: number, newDifficulty: QuestionIrtClassification | null }[] = [];
        this.questionDifficultyOverridesMap.forEach(
            (newDifficulty, idQuestion) => overrides.push({ idQuestion, newDifficulty })
        );

        this.exerciseDefinitionService.overrideQuestionDifficulties(idExerciseDefinition, overrides)
            .subscribe(() => {
                window.alert("Question difficulties successfully updated");
                this.questionDifficultyOverridesMap.clear();
                this.reloadComponentData(true, true);
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
