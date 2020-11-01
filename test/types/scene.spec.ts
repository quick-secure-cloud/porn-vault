import { expect } from "chai";
import { existsSync, unlinkSync } from "fs";
import { before } from "mocha";

import { indexActors } from "../../src/search/actor";
import { indexMovies } from "../../src/search/movie";
import { indexStudios } from "../../src/search/studio";
import Actor from "../../src/types/actor";
import Label from "../../src/types/label";
import Movie from "../../src/types/movie";
import Scene from "../../src/types/scene";
import Studio from "../../src/types/studio";
import { downloadTestVideo } from "../fixtures/files/dynamicTestFiles";
import { startTestServer, stopTestServer } from "../testServer";
import {
  actorCollection,
  labelCollection,
  movieCollection,
  studioCollection,
} from "./../../src/database";

describe("types", () => {
  describe("scene", () => {
    describe("onImport", () => {
      afterEach(() => {
        stopTestServer();
      });

      it("throws on invalid file", async function () {
        await startTestServer.call(this, {
          matching: {
            extractSceneActorsFromFilepath: false,
            extractSceneLabelsFromFilepath: false,
            extractSceneMoviesFromFilepath: false,
            extractSceneStudiosFromFilepath: false,
          },
        });

        const videoPath = "./test/fixtures/files/video001.mp4";

        let errored = false;

        try {
          await Scene.onImport(videoPath, false);
        } catch (err) {
          errored = true;
        }

        expect(errored).to.be.true;
      });

      describe("with real file", () => {
        const videoPath =
          "./test/fixtures/files/dynamic_video001_abc_actor_def_label_ghi_studio_jkl_movie.mp4";

        const seedActor = new Actor("abc actor");
        const seedLabel = new Label("def label");
        const seedStudio = new Studio("ghi studio");
        const seedMovie = new Movie("jkl movie");

        async function seedDb() {
          expect(await Actor.getAll()).to.be.empty;
          await actorCollection.upsert(seedActor._id, seedActor);
          await indexActors([seedActor]);
          expect(await Actor.getAll()).to.have.lengthOf(1);

          expect(await Label.getAll()).to.be.empty;
          await labelCollection.upsert(seedLabel._id, seedLabel);
          expect(await Label.getAll()).to.have.lengthOf(1);

          expect(await Studio.getAll()).to.be.empty;
          await studioCollection.upsert(seedStudio._id, seedStudio);
          await indexStudios([seedStudio]);
          expect(await Studio.getAll()).to.have.lengthOf(1);

          expect(await Movie.getAll()).to.be.empty;
          await movieCollection.upsert(seedMovie._id, seedMovie);
          await indexMovies([seedMovie]);
          expect(await Movie.getAll()).to.have.lengthOf(1);
        }

        before(async () => {
          await downloadTestVideo(videoPath);
        });

        after(() => {
          if (existsSync(videoPath)) {
            unlinkSync(videoPath);
          }
        });

        it("does not throw with real file", async function () {
          await startTestServer.call(this, {
            matching: {
              extractSceneActorsFromFilepath: false,
              extractSceneLabelsFromFilepath: false,
              extractSceneMoviesFromFilepath: false,
              extractSceneStudiosFromFilepath: false,
            },
          });

          let errored = false;
          let scene;

          try {
            scene = await Scene.onImport(videoPath, false);
          } catch (err) {
            errored = true;
          }

          expect(errored).to.be.false;
          expect(!!scene).to.be.true;
        });

        it("does not run extraction when global bool is false", async function () {
          await startTestServer.call(this, {
            matching: {
              extractSceneActorsFromFilepath: false,
              extractSceneLabelsFromFilepath: false,
              extractSceneMoviesFromFilepath: false,
              extractSceneStudiosFromFilepath: false,
            },
          });

          await seedDb();

          let errored = false;
          let scene;

          try {
            scene = await Scene.onImport(videoPath, false);
          } catch (err) {
            errored = true;
          }

          expect(errored).to.be.false;
          expect(!!scene).to.be.true;

          expect(await Scene.getActors(scene)).to.be.empty;
          expect(await Scene.getLabels(scene)).to.be.empty;
          expect(await Studio.getScenes(seedStudio)).to.be.empty;
          expect(await Scene.getMovies(scene)).to.be.empty;
        });

        it("does not run extraction when global bool is false and config is enabled", async function () {
          await startTestServer.call(this, {
            matching: {
              extractSceneActorsFromFilepath: true,
              extractSceneLabelsFromFilepath: true,
              extractSceneMoviesFromFilepath: true,
              extractSceneStudiosFromFilepath: true,
            },
          });

          await seedDb();

          let errored = false;
          let scene;

          try {
            scene = await Scene.onImport(videoPath, false);
          } catch (err) {
            errored = true;
          }

          expect(errored).to.be.false;
          expect(!!scene).to.be.true;

          expect(await Scene.getActors(scene)).to.be.empty;
          expect(await Scene.getLabels(scene)).to.be.empty;
          expect(await Studio.getScenes(seedStudio)).to.be.empty;
          expect(await Scene.getMovies(scene)).to.be.empty;
        });

        it("does not run extraction when config is disabled", async function () {
          await startTestServer.call(this, {
            matching: {
              extractSceneActorsFromFilepath: false,
              extractSceneLabelsFromFilepath: false,
              extractSceneMoviesFromFilepath: false,
              extractSceneStudiosFromFilepath: false,
            },
          });

          await seedDb();

          let errored = false;
          let scene;

          try {
            scene = await Scene.onImport(videoPath, true);
          } catch (err) {
            errored = true;
          }

          expect(errored).to.be.false;
          expect(!!scene).to.be.true;

          expect(await Scene.getActors(scene)).to.be.empty;
          expect(await Scene.getLabels(scene)).to.be.empty;
          expect(await Studio.getScenes(seedStudio)).to.be.empty;
          expect(await Scene.getMovies(scene)).to.be.empty;
        });

        it("does run extraction when config is enabled", async function () {
          await startTestServer.call(this, {
            matching: {
              extractSceneActorsFromFilepath: true,
              extractSceneLabelsFromFilepath: true,
              extractSceneMoviesFromFilepath: true,
              extractSceneStudiosFromFilepath: true,
            },
          });

          await seedDb();

          let errored = false;
          let scene;

          try {
            scene = await Scene.onImport(videoPath, true);
          } catch (err) {
            errored = true;
          }

          expect(errored).to.be.false;
          expect(!!scene).to.be.true;

          const sceneActors = await Scene.getActors(scene);
          expect(sceneActors).to.have.lengthOf(1);
          expect(sceneActors[0]._id).to.equal(seedActor._id);

          const sceneLabels = await Scene.getLabels(scene);
          expect(sceneLabels).to.have.lengthOf(1);
          expect(sceneLabels[0]._id).to.equal(seedLabel._id);

          expect(scene.studio).to.not.be.empty;
          const sceneStudio = await Studio.getById(scene.studio);
          expect(!!sceneStudio).to.be.true;
          expect((sceneStudio as Studio)._id).to.equal(seedStudio._id);

          const sceneMovies = await Scene.getMovies(scene);
          expect(sceneMovies).to.have.lengthOf(1);
          expect(sceneMovies[0]._id).to.equal(seedMovie._id);
        });
      });
    });
  });
});
