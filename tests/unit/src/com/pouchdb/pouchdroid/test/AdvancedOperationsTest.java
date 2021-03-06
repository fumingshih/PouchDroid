package com.pouchdb.pouchdroid.test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import android.annotation.SuppressLint;
import android.test.ActivityInstrumentationTestCase2;
import android.util.Log;

import com.pouchdb.pouchdroid.appforunittests.MainActivity;
import com.pouchdb.pouchdroid.pouch.PouchAttachment;
import com.pouchdb.pouchdroid.pouch.PouchDB;
import com.pouchdb.pouchdroid.pouch.model.AllDocsInfo;
import com.pouchdb.pouchdroid.pouch.model.AllDocsInfo.Row;
import com.pouchdb.pouchdroid.pouch.model.DatabaseInfo;
import com.pouchdb.pouchdroid.pouch.model.MapFunction;
import com.pouchdb.pouchdroid.pouch.model.PouchInfo;
import com.pouchdb.pouchdroid.test.data.Person;
import com.pouchdb.pouchdroid.test.util.TestUtils;
import com.pouchdb.pouchdroid.util.Base64Compat;
import com.pouchdb.pouchdroid.util.JsonUtil;
import com.pouchdb.pouchdroid.util.PouchOptions;

public class AdvancedOperationsTest extends ActivityInstrumentationTestCase2<MainActivity> {
    
    private String dbName;
    private PouchDB<Person> pouchDB;
    
    @SuppressLint("NewApi")
    public AdvancedOperationsTest() {
        super(MainActivity.class);
    }
    
    @Override
    protected void setUp() throws Exception {
        super.setUp();
        while (getActivity() == null || !getActivity().isPouchDroidReady()) {
            Thread.sleep(100);
            Log.i("Tests", "Waiting for pouchDroid to not be null");
        }
        Log.i("Tests", "pouchdroid is not null");
        dbName = "unit-test-" + Integer.toHexString(new Random().nextInt());
        pouchDB = PouchDB.newPouchDB(Person.class, 
                getActivity().getPouchDroid(), dbName);
        
        pouchDB.post(new Person("Mr. Hankey", 342143, 5, null, false));
        pouchDB.post(new Person("Butters", 3412, 3, null, false));
        
        Person randy = new Person("Randy Marsh", 43234, 0, null, true);
        randy.addPouchAttachment("foobar.txt", new PouchAttachment("text/plain", "foobar".getBytes()));
        randy.addPouchAttachment("foobaz.txt", new PouchAttachment("text/plain", "foobaz".getBytes()));
        randy.setPouchId("randy");
        pouchDB.put(randy);
    }

    @Override
    protected void tearDown() throws Exception {
        super.tearDown();
        if (pouchDB != null) {
            Log.i("Tests", "Destroying pouchDroid");
            pouchDB.destroy();
            Log.i("Tests", "Destroyed pouchDroid");
        }
    }
    
    
    public void testDatabaseInfo() {
        
        DatabaseInfo info = pouchDB.info();
        assertEquals("_pouch_" + pouchDB.getName(), info.getDbName());
        assertEquals(3, info.getDocCount());
        assertEquals(3, info.getUpdateSeq());
    }
    
    public void testMap() {
        
        // all these map functions should return 3 documents
        MapFunction[] mapFunctions = new MapFunction[]{
                MapFunction.fromJavascript("function(doc){emit(doc.numberOfPetsOwned, null);}"),
                MapFunction.simpleFieldLookup("numberOfPetsOwned"),
                MapFunction.simpleFieldLookup("numberOfPetsOwned", "belieber")
                };
        
        for (MapFunction map : mapFunctions) {
        
            AllDocsInfo<Person> response = pouchDB.query(map, null, PouchOptions.includeDocs());
            
            Log.i("Tests", response.toString());
            assertEquals(3, response.getDocuments().size());
            Set<Integer> numPets = new HashSet<Integer>();
            for (Row<Person> row : response.getRows()) {
                int pets = (row.getKey() instanceof Integer) 
                        ? (Integer)row.getKey() 
                        : (Integer)(((List<?>)row.getKey()).get(0));
                numPets.add(pets);
            }
            assertEquals(new HashSet<Integer>(Arrays.asList(5, 3, 0)), numPets);
        }
    }
    
    public void testFilteredMap() {
        AllDocsInfo<Person> response = pouchDB.query(MapFunction.fromJavascript(
                "function(doc){if (doc.numberOfPetsOwned <= 3){emit(doc.numberOfPetsOwned, null);}}"), 
                null, PouchOptions.includeDocs());
        assertEquals(2, response.getRows().size());
        assertEquals(2, response.getDocuments().size());
        assertEquals(2, response.getTotalRows());
    }
    
    public void testBasicQuery() {
        MapFunction map = MapFunction.simpleFieldLookup("numberOfPetsOwned");
        assertEquals(1, pouchDB.query(map, PouchOptions.key(5)).getDocuments().size());
        assertEquals(1, pouchDB.query(map, PouchOptions.key(3)).getDocuments().size());
        assertEquals(1, pouchDB.query(map, PouchOptions.key(0)).getDocuments().size());
        assertEquals(0, pouchDB.query(map, PouchOptions.key(52)).getDocuments().size());
    }
    
    public void testComplexQuery() {
        MapFunction map = MapFunction.simpleFieldLookup("numberOfPetsOwned", "belieber");
        assertEquals(1, pouchDB.query(map, PouchOptions.key(Arrays.<Object>asList(0, true))).getDocuments().size());
        assertEquals(1, pouchDB.query(map, PouchOptions.key(Arrays.<Object>asList(3, false))).getDocuments().size());
        assertEquals(1, pouchDB.query(map, PouchOptions.key(Arrays.<Object>asList(5, false))).getDocuments().size());
        assertEquals(0, pouchDB.query(map, PouchOptions.key(Arrays.<Object>asList(52, true))).getDocuments().size());
    }
    
    public void testGetInlineAttachments() {
        Person randy  = pouchDB.get("randy", PouchOptions.attachments());
        assertEquals(new HashSet<String>(Arrays.asList("foobar.txt", "foobaz.txt")), randy.getPouchAttachments().keySet());
        
        PouchAttachment foobar = randy.getPouchAttachments().get("foobar.txt");
        assertEquals("foobar", new String(foobar.getData()));
        assertEquals("text/plain", foobar.getContentType());
        assertEquals(0, foobar.getRevpos());
        assertEquals("md5-3858f62230ac3c915f300c664312c63f", foobar.getDigest());
        
        PouchAttachment foobaz = randy.getPouchAttachments().get("foobaz.txt");
        assertEquals("foobaz", new String(foobaz.getData()));
        assertEquals("text/plain", foobaz.getContentType());
        assertEquals(0, foobaz.getRevpos());
        assertEquals("md5-80338e79d2ca9b9c090ebaaa2ef293c7", foobaz.getDigest());
    }
    
    public void testGetAttachments() {
        PouchAttachment foobar = pouchDB.getAttachment("randy", "foobar.txt");
        assertEquals("foobar", new String(foobar.getData()));
        assertEquals("text/plain", foobar.getContentType());
        
        PouchAttachment foobaz = pouchDB.getAttachment("randy", "foobaz.txt");
        assertEquals("foobaz", new String(foobaz.getData()));
        assertEquals("text/plain", foobaz.getContentType());
    }
    
    public void testPutAttachment() {
        Person randy = pouchDB.get("randy");
        
        PouchInfo info = pouchDB.putAttachment("randy", "foobuzz.txt", randy.getPouchRev(), "foobuzz".getBytes(), 
                "text/plain");
        assertEquals(true, info.isOk());
        assertEquals("randy", info.getId());
        assertNotNull(info.getRev());
        
        PouchAttachment foobuzz = pouchDB.getAttachment("randy", "foobuzz.txt");
        assertEquals("foobuzz", new String(foobuzz.getData()));
        assertEquals("text/plain", foobuzz.getContentType());
    }
    
    public void testPutSmallAttachment() throws IOException {
        Person randy = pouchDB.get("randy");
        
        // taken from the pouchdb tests, it's a small icon
        String pngEncoded = 
                "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAMFBMVEX+9+j+9OD+7tL95rr93qT80YD7x2L6vkn6syz5qRT4" +
        		"ogT4nwD4ngD4nQD4nQD4nQDT2nT/AAAAcElEQVQY002OUQLEQARDw1D14f7X3TCdbfPnhQTqI5UqvGOWIz8gAIXFH9zmC63XRyTsO" +
        		"sCWk2A9Ga7wCXlA9m2S6G4JlVwQkpw/YmxrUgNoMoyxBwSMH/WnAzy5cnfLFu+dK2l5gMvuPGLGJd1/9AOiBQiEgkzOpgAAAABJRU" +
        		"5ErkJggg==";
        
        byte[] png = Base64Compat.decode(pngEncoded, Base64Compat.DEFAULT);
        
        PouchInfo info = pouchDB.putAttachment("randy", "amz.png", randy.getPouchRev(), png, "image/png");
        assertEquals(true, info.isOk());
        assertEquals("randy", info.getId());
        assertNotNull(info.getRev());
        
        PouchAttachment pngAttachment = pouchDB.getAttachment("randy", "amz.png");
        
        System.out.println("expected:\n" + TestUtils.toHexList(png));
        System.out.println("actual  :\n" + TestUtils.toHexList(pngAttachment.getData()));
        assertTrue(Arrays.equals(png, pngAttachment.getData()));
        assertEquals("image/png", pngAttachment.getContentType());
    }
    
    public void testPutLargeAttachment() throws IOException {
        
        InputStream inputStream = getActivity().getAssets().open("android.png");
        
        byte[] png = TestUtils.read(inputStream);
        inputStream.close();
        
        Person randy = pouchDB.get("randy");
        
        PouchInfo info = pouchDB.putAttachment("randy", "android.png", randy.getPouchRev(), png, "image/png");
        assertEquals(true, info.isOk());
        assertEquals("randy", info.getId());
        assertNotNull(info.getRev());
        
        PouchAttachment pngAttachment = pouchDB.getAttachment("randy", "android.png");
        System.out.println("expected:\n" + JsonUtil.simpleBase64(png));
        System.out.println("actual  :\n" + JsonUtil.simpleBase64(pngAttachment.getData()));
        System.out.println("expected:\n" + TestUtils.toHexList(png));
        System.out.println("actual  :\n" + TestUtils.toHexList(pngAttachment.getData()));
        List<String> expectedHexList = TestUtils.toHexList(png);
        List<String> actualHexList = TestUtils.toHexList(pngAttachment.getData());
        System.out.println("expected (end of array):\n" + expectedHexList.subList(expectedHexList.size() - 100, expectedHexList.size()));
        System.out.println("actual   (end of array):\n" + actualHexList.subList(actualHexList.size() - 100, actualHexList.size()));
        assertTrue(Arrays.equals(png, pngAttachment.getData()));
        assertEquals("image/png", pngAttachment.getContentType());
    }
}
